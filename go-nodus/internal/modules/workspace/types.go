package workspace

import "github.com/google/uuid"

type createWorkspaceRequest struct {
	Name string `json:"name" binding:"required"`
}

type renameWorkspaceRequest struct {
	Name string `json:"name" binding:"required"`
}

// addMemberRequest: role is member when left out.
type addMemberRequest struct {
	Email string `json:"email" binding:"required,email,max=254"`
	Role  string `json:"role" binding:"omitempty,oneof=owner member"`
}

type changeMemberRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=owner member"`
}

type memberResponse struct {
	UserID uuid.UUID `json:"userId"`
	Email  string    `json:"email"`
	Role   string    `json:"role"`
}
