package workspace

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/auth"
)

var (
	errUserNotFound   = httpx.NewError(http.StatusNotFound, "user_not_found", "No account has this email")
	errAlreadyMember  = httpx.NewError(http.StatusConflict, "already_member", "This account is already a member")
	errLastOwner      = httpx.NewError(http.StatusConflict, "last_owner", "A workspace needs at least one owner")
	errMemberNotFound = httpx.NewError(http.StatusNotFound, "user_not_found", "This user is not a member")
)

func (service *Service) ListMembers(
	ctx context.Context,
	userID uuid.UUID,
	workspaceID uuid.UUID,
) ([]memberResponse, error) {
	database := service.db.WithContext(ctx)

	_, err := loadRole(database, workspaceID, userID)
	if err != nil {
		return nil, err
	}

	members := []memberResponse{}
	err = database.Table("workspace_members").
		Select("users.id AS user_id, users.email, workspace_members.role").
		Joins("JOIN users ON users.id = workspace_members.user_id").
		Where("workspace_members.workspace_id = ?", workspaceID).
		Order("workspace_members.created_at, users.email").
		Scan(&members).Error

	return members, err
}

// AddMember adds an existing account by email; there is no email invitation.
// Every attempt by an owner counts toward the limit, found or not, so emails cannot be probed.
func (service *Service) AddMember(
	ctx context.Context,
	userID uuid.UUID,
	workspaceID uuid.UUID,
	request addMemberRequest,
) (memberResponse, error) {
	database := service.db.WithContext(ctx)

	err := checkOwner(database, workspaceID, userID)
	if err != nil {
		return memberResponse{}, err
	}

	limitKey := userID.String()
	if service.memberLimiter.IsBlocked(limitKey) {
		return memberResponse{}, httpx.ErrRateLimited
	}

	service.memberLimiter.Hit(limitKey)

	var user db.User
	err = database.Select("id", "email").Where("email = ?", auth.NormalizeEmail(request.Email)).Take(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return memberResponse{}, errUserNotFound
	}

	if err != nil {
		return memberResponse{}, err
	}

	role := request.Role
	if role == "" {
		role = auth.RoleMember
	}

	err = database.Create(&db.WorkspaceMember{WorkspaceID: workspaceID, UserID: user.ID, Role: role}).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return memberResponse{}, errAlreadyMember
	}

	if err != nil {
		return memberResponse{}, err
	}

	return memberResponse{UserID: user.ID, Email: user.Email, Role: role}, nil
}

// ChangeRole is for owners only; demoting the last owner is refused.
func (service *Service) ChangeRole(
	ctx context.Context,
	userID uuid.UUID,
	workspaceID uuid.UUID,
	memberID uuid.UUID,
	request changeMemberRoleRequest,
) (memberResponse, error) {
	var changed memberResponse

	err := service.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := checkOwner(tx, workspaceID, userID)
		if err != nil {
			return err
		}

		err = lockWorkspace(tx, workspaceID)
		if err != nil {
			return err
		}

		member, err := loadMember(tx, workspaceID, memberID)
		if err != nil {
			return err
		}

		if member.Role == auth.RoleOwner && request.Role != auth.RoleOwner {
			err = checkNotLastOwner(tx, workspaceID)
			if err != nil {
				return err
			}
		}

		err = tx.Model(&db.WorkspaceMember{}).
			Where("workspace_id = ? AND user_id = ?", workspaceID, memberID).
			Update("role", request.Role).Error
		if err != nil {
			return err
		}

		changed = memberResponse{UserID: member.UserID, Email: member.Email, Role: request.Role}

		return nil
	})

	return changed, err
}

// RemoveMember: an owner removes anyone, a member removes only themselves (leaves). The last owner stays.
func (service *Service) RemoveMember(
	ctx context.Context,
	userID uuid.UUID,
	workspaceID uuid.UUID,
	memberID uuid.UUID,
) error {
	return service.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		callerRole, err := loadRole(tx, workspaceID, userID)
		if err != nil {
			return err
		}

		if memberID != userID && callerRole != auth.RoleOwner {
			return httpx.ErrForbidden
		}

		err = lockWorkspace(tx, workspaceID)
		if err != nil {
			return err
		}

		member, err := loadMember(tx, workspaceID, memberID)
		if err != nil {
			return err
		}

		if member.Role == auth.RoleOwner {
			err = checkNotLastOwner(tx, workspaceID)
			if err != nil {
				return err
			}
		}

		return tx.Delete(&db.WorkspaceMember{}, "workspace_id = ? AND user_id = ?", workspaceID, memberID).Error
	})
}

func loadMember(tx *gorm.DB, workspaceID uuid.UUID, memberID uuid.UUID) (memberResponse, error) {
	var member memberResponse
	result := tx.Table("workspace_members").
		Select("users.id AS user_id, users.email, workspace_members.role").
		Joins("JOIN users ON users.id = workspace_members.user_id").
		Where("workspace_members.workspace_id = ? AND workspace_members.user_id = ?", workspaceID, memberID).
		Scan(&member)

	if result.Error != nil {
		return memberResponse{}, result.Error
	}

	if result.RowsAffected == 0 {
		return memberResponse{}, errMemberNotFound
	}

	return member, nil
}

// Call with the workspace locked, before taking the owner role away from someone.
func checkNotLastOwner(tx *gorm.DB, workspaceID uuid.UUID) error {
	var owners int64
	err := tx.Model(&db.WorkspaceMember{}).
		Where("workspace_id = ? AND role = ?", workspaceID, auth.RoleOwner).
		Count(&owners).Error

	if err != nil {
		return err
	}

	if owners <= 1 {
		return errLastOwner
	}

	return nil
}
