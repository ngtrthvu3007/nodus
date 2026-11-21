package workspace

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/auth"
)

var errInsufficientScope = httpx.NewError(http.StatusForbidden, "insufficient_scope", "This token can only read docs")

// CanAccess is the one permission check for docs, folders, links, search and export (ADR-002):
// not a member → 404 workspace_not_found, so whether the workspace exists stays hidden;
// a write with a docs:read token → 403 insufficient_scope, checked after membership to keep 401 → 404 → 403.
// Share (FRD-share) will extend this function, not each query.
func CanAccess(tx *gorm.DB, principal auth.Principal, workspaceID uuid.UUID, write bool) error {
	_, err := loadRole(tx, workspaceID, principal.UserID)
	if err != nil {
		return err
	}

	if write && !principal.CanWriteDocs() {
		return errInsufficientScope
	}

	return nil
}

// CanAccessResource is CanAccess for a route by doc or folder id. A non-member gets the resource's own not-found,
// so an id from another workspace looks like no doc or folder at all.
func CanAccessResource(
	tx *gorm.DB,
	principal auth.Principal,
	workspaceID uuid.UUID,
	write bool,
	notFound *httpx.Error,
) error {
	err := CanAccess(tx, principal, workspaceID, write)
	if errors.Is(err, httpx.ErrWorkspaceNotFound) {
		return notFound
	}

	return err
}

// Guard runs CanAccess on routes with :workspaceId, after httpx.ParseWorkspaceID.
type Guard struct {
	db *gorm.DB
}

func NewGuard(database *gorm.DB) *Guard {
	return &Guard{db: database}
}

func (guard *Guard) RequireRead() gin.HandlerFunc {
	return guard.requireAccess(false)
}

// RequireWrite is for every route that writes docs or folders: the auth middleware no longer stops docs:read tokens.
func (guard *Guard) RequireWrite() gin.HandlerFunc {
	return guard.requireAccess(true)
}

func (guard *Guard) requireAccess(write bool) gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		database := guard.db.WithContext(ginContext.Request.Context())

		err := CanAccess(database, auth.GetPrincipal(ginContext), httpx.GetWorkspaceID(ginContext), write)
		if err != nil {
			httpx.AbortWithError(ginContext, err)
		}
	}
}

// loadRole is the user's role in the workspace; not a member → httpx.ErrWorkspaceNotFound.
func loadRole(tx *gorm.DB, workspaceID uuid.UUID, userID uuid.UUID) (string, error) {
	var member db.WorkspaceMember
	err := tx.Select("role").Where("workspace_id = ? AND user_id = ?", workspaceID, userID).Take(&member).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", httpx.ErrWorkspaceNotFound
	}

	return member.Role, err
}

// checkOwner: a non-member gets 404, a member who is not an owner gets 403.
func checkOwner(tx *gorm.DB, workspaceID uuid.UUID, userID uuid.UUID) error {
	role, err := loadRole(tx, workspaceID, userID)
	if err != nil {
		return err
	}

	if role != auth.RoleOwner {
		return httpx.ErrForbidden
	}

	return nil
}
