package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	AuthMethodSession = "session"
	AuthMethodToken   = "token"

	ScopeDocsRead  = "docs:read"
	ScopeDocsWrite = "docs:write"
)

const principalKey = "principal"

// Principal is who calls the API, whatever the credential (session cookie or personal access token).
type Principal struct {
	UserID     uuid.UUID
	AuthMethod string
	// Scope of the token; empty for a session, which can do everything the user can.
	Scope string
	// SessionID is set for a session, so logout ends only that one.
	SessionID uuid.UUID
}

// GetPrincipal returns the caller set by Authenticate. Every non-public route has one.
func GetPrincipal(ginContext *gin.Context) Principal {
	principal, _ := ginContext.Value(principalKey).(Principal)
	return principal
}

func (principal Principal) canWrite() bool {
	return principal.AuthMethod == AuthMethodSession || principal.Scope == ScopeDocsWrite
}
