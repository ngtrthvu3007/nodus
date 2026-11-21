package auth

import (
	"time"

	"github.com/google/uuid"
)

type registerRequest struct {
	Email    string `json:"email" binding:"required,email,max=254"`
	Password string `json:"password" binding:"required"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// userResponse is the answer of register and login.
type userResponse struct {
	ID    uuid.UUID `json:"id"`
	Email string    `json:"email"`
}

// currentUserResponse is GET /me: the user and the workspaces they belong to.
type currentUserResponse struct {
	ID         uuid.UUID          `json:"id"`
	Email      string             `json:"email"`
	Workspaces []WorkspaceSummary `json:"workspaces"`
}

// WorkspaceSummary is a workspace as one of its members sees it; GET /workspaces answers a list of them.
type WorkspaceSummary struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Role string    `json:"role"`
}

type createTokenRequest struct {
	Name     string `json:"name" binding:"required"`
	Scope    string `json:"scope" binding:"required,oneof=docs:read docs:write"`
	Password string `json:"password" binding:"required"`
}

type tokenResponse struct {
	ID         uuid.UUID  `json:"id"`
	Name       string     `json:"name"`
	Scope      string     `json:"scope"`
	CreatedAt  time.Time  `json:"createdAt"`
	LastUsedAt *time.Time `json:"lastUsedAt"`
}

// createdTokenResponse is the only response that holds the token itself.
type createdTokenResponse struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Scope string    `json:"scope"`
	Token string    `json:"token"`
}

// clientInfo is stored with a session so the user can tell their devices apart.
type clientInfo struct {
	IP        string
	UserAgent string
}

// signedIn is a new session: the user to answer with and the cookie value to set.
type signedIn struct {
	user         userResponse
	sessionToken string
}
