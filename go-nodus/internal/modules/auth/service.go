package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
	"go-nodus/internal/ratelimit"
)

const (
	sessionIdleTimeout = 14 * 24 * time.Hour
	sessionLifetime    = 30 * 24 * time.Hour
	// last_used_at of sessions and tokens is written at most once per interval, not on every request.
	lastUsedWriteInterval = time.Minute

	personalWorkspaceName = "Personal"
	roleOwner             = "owner"
)

var (
	errUnauthenticated    = httpx.NewError(http.StatusUnauthorized, "unauthenticated", "Sign in to continue")
	errInvalidCredentials = httpx.NewError(http.StatusUnauthorized, "invalid_credentials", "Wrong email or password")
	errInvalidPassword    = httpx.NewError(http.StatusForbidden, "invalid_password", "Password is incorrect")
	errInsufficientScope  = httpx.NewError(http.StatusForbidden, "insufficient_scope", "This token can only read")
	errEmailTaken         = httpx.NewError(http.StatusConflict, "email_taken", "Email is already registered")
)

// LoginLimiters count failed logins per email and per IP.
type LoginLimiters struct {
	Email *ratelimit.Limiter
	IP    *ratelimit.Limiter
}

type Service struct {
	db            *gorm.DB
	loginLimiters LoginLimiters
}

func NewService(database *gorm.DB, loginLimiters LoginLimiters) *Service {
	return &Service{db: database, loginLimiters: loginLimiters}
}

// Register creates the account, its personal workspace (the user is owner) and a session, in one transaction.
func (service *Service) Register(ctx context.Context, request registerRequest, client clientInfo) (signedIn, error) {
	err := checkPassword(request.Password)
	if err != nil {
		return signedIn{}, err
	}

	passwordHash := hashPassword(request.Password)
	user := db.User{Email: normalizeEmail(request.Email), PasswordHash: &passwordHash}

	var sessionToken string
	err = service.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Create(&user).Error
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return errEmailTaken
		}

		if err != nil {
			return err
		}

		err = createPersonalWorkspace(tx, user.ID)
		if err != nil {
			return err
		}

		sessionToken, err = createSession(tx, user.ID, client)
		return err
	})

	if err != nil {
		return signedIn{}, err
	}

	return signedIn{user: toUserResponse(user), sessionToken: sessionToken}, nil
}

// Login answers the same error for an unknown email and a wrong password.
// Failures are counted per email and per IP; past the limit every attempt is refused.
func (service *Service) Login(ctx context.Context, request loginRequest, client clientInfo) (signedIn, error) {
	database := service.db.WithContext(ctx)
	email := normalizeEmail(request.Email)

	if service.loginLimiters.Email.IsBlocked(email) || service.loginLimiters.IP.IsBlocked(client.IP) {
		return signedIn{}, httpx.ErrRateLimited
	}

	user, err := checkCredentials(database, email, request.Password)
	if errors.Is(err, errInvalidCredentials) {
		service.loginLimiters.Email.Hit(email)
		service.loginLimiters.IP.Hit(client.IP)
	}

	if err != nil {
		return signedIn{}, err
	}

	service.loginLimiters.Email.Reset(email)

	var sessionToken string
	err = database.Transaction(func(tx *gorm.DB) error {
		err := deleteEndedSessions(tx, user.ID)
		if err != nil {
			return err
		}

		sessionToken, err = createSession(tx, user.ID, client)
		return err
	})

	if err != nil {
		return signedIn{}, err
	}

	return signedIn{user: toUserResponse(*user), sessionToken: sessionToken}, nil
}

func (service *Service) Logout(ctx context.Context, sessionID uuid.UUID) error {
	return service.db.WithContext(ctx).Delete(&db.Session{}, "id = ?", sessionID).Error
}

// LogoutAll ends every session of the user, the current one included. Tokens stay valid.
func (service *Service) LogoutAll(ctx context.Context, userID uuid.UUID) error {
	return service.db.WithContext(ctx).Delete(&db.Session{}, "user_id = ?", userID).Error
}

func (service *Service) GetUser(ctx context.Context, userID uuid.UUID) (userResponse, error) {
	user, err := httpx.FindByID[db.User](service.db.WithContext(ctx), userID, errUnauthenticated)
	if err != nil {
		return userResponse{}, err
	}

	return toUserResponse(*user), nil
}

// ResolveSession finds the live session of a cookie value.
func (service *Service) ResolveSession(ctx context.Context, sessionToken string) (Principal, error) {
	database := service.db.WithContext(ctx)
	now := time.Now()
	idleSince := now.Add(-sessionIdleTimeout)

	var session db.Session
	err := database.
		Where("token_hash = ? AND expires_at > ? AND last_used_at > ?", hashSecret(sessionToken), now, idleSince).
		First(&session).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return Principal{}, errUnauthenticated
	}

	if err != nil {
		return Principal{}, err
	}

	if now.Sub(session.LastUsedAt) > lastUsedWriteInterval {
		err = database.Model(&db.Session{}).Where("id = ?", session.ID).Update("last_used_at", now).Error
		if err != nil {
			return Principal{}, err
		}
	}

	return Principal{UserID: session.UserID, AuthMethod: AuthMethodSession, SessionID: session.ID}, nil
}

// checkCredentials returns errInvalidCredentials for an unknown email, an account without a password
// (OAuth only) and a wrong password alike.
func checkCredentials(database *gorm.DB, email string, password string) (*db.User, error) {
	var user db.User
	err := database.Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errInvalidCredentials
	}

	if err != nil {
		return nil, err
	}

	if user.PasswordHash == nil {
		return nil, errInvalidCredentials
	}

	ok, err := verifyPassword(password, *user.PasswordHash)
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errInvalidCredentials
	}

	return &user, nil
}

func createPersonalWorkspace(tx *gorm.DB, userID uuid.UUID) error {
	workspace := db.Workspace{Name: personalWorkspaceName}

	err := tx.Create(&workspace).Error
	if err != nil {
		return err
	}

	member := db.WorkspaceMember{WorkspaceID: workspace.ID, UserID: userID, Role: roleOwner}

	return tx.Create(&member).Error
}

// createSession always makes a new session (never reuses one), which prevents session fixation.
func createSession(tx *gorm.DB, userID uuid.UUID, client clientInfo) (string, error) {
	sessionToken := generateSecret()
	now := time.Now()

	session := db.Session{
		UserID:     userID,
		TokenHash:  hashSecret(sessionToken),
		UserAgent:  client.UserAgent,
		IP:         client.IP,
		LastUsedAt: now,
		ExpiresAt:  now.Add(sessionLifetime),
	}

	err := tx.Create(&session).Error
	if err != nil {
		return "", err
	}

	return sessionToken, nil
}

// deleteEndedSessions removes the user's expired sessions, so the table does not grow without a cleanup job.
func deleteEndedSessions(tx *gorm.DB, userID uuid.UUID) error {
	now := time.Now()

	return tx.Delete(
		&db.Session{},
		"user_id = ? AND (expires_at <= ? OR last_used_at <= ?)",
		userID,
		now,
		now.Add(-sessionIdleTimeout),
	).Error
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func toUserResponse(user db.User) userResponse {
	return userResponse{ID: user.ID, Email: user.Email}
}
