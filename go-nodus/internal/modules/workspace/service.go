package workspace

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/auth"
	"go-nodus/internal/ratelimit"
)

const maxWorkspaceNameLength = 100

var errInvalidWorkspaceName = httpx.NewError(
	http.StatusBadRequest,
	"invalid_params",
	"Workspace name must be 1-100 characters",
)

type Service struct {
	db *gorm.DB
	// Counts member additions per owner, so the add-member route cannot be used to probe which emails have accounts.
	memberLimiter *ratelimit.Limiter
}

func NewService(database *gorm.DB, memberLimiter *ratelimit.Limiter) *Service {
	return &Service{db: database, memberLimiter: memberLimiter}
}

func (service *Service) List(ctx context.Context, userID uuid.UUID) ([]auth.WorkspaceSummary, error) {
	return auth.ListWorkspaces(service.db.WithContext(ctx), userID)
}

// Create makes the caller the owner of the new workspace.
func (service *Service) Create(
	ctx context.Context,
	userID uuid.UUID,
	request createWorkspaceRequest,
) (auth.WorkspaceSummary, error) {
	name, err := validateWorkspaceName(request.Name)
	if err != nil {
		return auth.WorkspaceSummary{}, err
	}

	workspace := db.Workspace{Name: name}
	err = service.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Create(&workspace).Error
		if err != nil {
			return err
		}

		return tx.Create(&db.WorkspaceMember{WorkspaceID: workspace.ID, UserID: userID, Role: auth.RoleOwner}).Error
	})

	if err != nil {
		return auth.WorkspaceSummary{}, err
	}

	return auth.WorkspaceSummary{ID: workspace.ID, Name: workspace.Name, Role: auth.RoleOwner}, nil
}

func (service *Service) Rename(
	ctx context.Context,
	userID uuid.UUID,
	workspaceID uuid.UUID,
	request renameWorkspaceRequest,
) (auth.WorkspaceSummary, error) {
	database := service.db.WithContext(ctx)

	err := checkOwner(database, workspaceID, userID)
	if err != nil {
		return auth.WorkspaceSummary{}, err
	}

	name, err := validateWorkspaceName(request.Name)
	if err != nil {
		return auth.WorkspaceSummary{}, err
	}

	err = database.Model(&db.Workspace{}).Where("id = ?", workspaceID).Update("name", name).Error
	if err != nil {
		return auth.WorkspaceSummary{}, err
	}

	return auth.WorkspaceSummary{ID: workspaceID, Name: name, Role: auth.RoleOwner}, nil
}

// Delete removes the workspace and, through the foreign keys, every folder, doc, link and member in it.
// The frontend asks for the workspace name again before calling it.
func (service *Service) Delete(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) error {
	return service.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := checkOwner(tx, workspaceID, userID)
		if err != nil {
			return err
		}

		return tx.Delete(&db.Workspace{}, "id = ?", workspaceID).Error
	})
}

func validateWorkspaceName(name string) (string, error) {
	trimmed := strings.TrimSpace(name)

	length := utf8.RuneCountInString(trimmed)
	if length == 0 || length > maxWorkspaceNameLength {
		return "", errInvalidWorkspaceName
	}

	return trimmed, nil
}

// lockWorkspace serializes member changes in one workspace, so two owners cannot demote each other at once.
func lockWorkspace(tx *gorm.DB, workspaceID uuid.UUID) error {
	forUpdate := clause.Locking{Strength: clause.LockingStrengthUpdate}

	err := tx.Clauses(forUpdate).Select("id").Where("id = ?", workspaceID).Take(&db.Workspace{}).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return httpx.ErrWorkspaceNotFound
	}

	return err
}
