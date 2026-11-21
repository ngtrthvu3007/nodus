package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
)

const maxTokenNameLength = 100

var (
	errTokenNotFound    = httpx.NewError(http.StatusNotFound, "token_not_found", "Token is not found")
	errInvalidTokenName = httpx.NewError(http.StatusBadRequest, "invalid_params", "Name must be 1-100 characters")
)

// CreateToken asks for the password again before making a token.
// The response is the only place the token appears; only its SHA-256 is stored.
func (service *Service) CreateToken(
	ctx context.Context,
	userID uuid.UUID,
	request createTokenRequest,
) (createdTokenResponse, error) {
	database := service.db.WithContext(ctx)

	name := strings.TrimSpace(request.Name)
	if name == "" || utf8.RuneCountInString(name) > maxTokenNameLength {
		return createdTokenResponse{}, errInvalidTokenName
	}

	err := checkUserPassword(database, userID, request.Password)
	if err != nil {
		return createdTokenResponse{}, err
	}

	token := generateToken()
	record := db.PersonalAccessToken{
		UserID:    userID,
		Name:      name,
		TokenHash: hashSecret(token),
		Scope:     request.Scope,
	}

	err = database.Create(&record).Error
	if err != nil {
		return createdTokenResponse{}, err
	}

	return createdTokenResponse{ID: record.ID, Name: record.Name, Scope: record.Scope, Token: token}, nil
}

// ListTokens leaves out revoked tokens, newest first.
func (service *Service) ListTokens(ctx context.Context, userID uuid.UUID) ([]tokenResponse, error) {
	var records []db.PersonalAccessToken
	err := service.db.WithContext(ctx).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Order("created_at DESC").
		Find(&records).Error

	if err != nil {
		return nil, err
	}

	tokens := make([]tokenResponse, 0, len(records))
	for _, record := range records {
		tokens = append(tokens, tokenResponse{
			ID:         record.ID,
			Name:       record.Name,
			Scope:      record.Scope,
			CreatedAt:  record.CreatedAt,
			LastUsedAt: record.LastUsedAt,
		})
	}

	return tokens, nil
}

// RevokeToken takes effect on the next request. Another user's token, or one already revoked, is not found.
func (service *Service) RevokeToken(ctx context.Context, userID uuid.UUID, tokenID uuid.UUID) error {
	result := service.db.WithContext(ctx).
		Model(&db.PersonalAccessToken{}).
		Where("id = ? AND user_id = ? AND revoked_at IS NULL", tokenID, userID).
		Update("revoked_at", time.Now())

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errTokenNotFound
	}

	return nil
}

// ResolveToken finds the live token of a Bearer value.
func (service *Service) ResolveToken(ctx context.Context, token string) (Principal, error) {
	if !isToken(token) {
		return Principal{}, errUnauthenticated
	}

	database := service.db.WithContext(ctx)

	var record db.PersonalAccessToken
	err := database.Where("token_hash = ? AND revoked_at IS NULL", hashSecret(token)).First(&record).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return Principal{}, errUnauthenticated
	}

	if err != nil {
		return Principal{}, err
	}

	now := time.Now()
	if record.LastUsedAt == nil || now.Sub(*record.LastUsedAt) > lastUsedWriteInterval {
		err = database.Model(&db.PersonalAccessToken{}).Where("id = ?", record.ID).Update("last_used_at", now).Error
		if err != nil {
			return Principal{}, err
		}
	}

	return Principal{UserID: record.UserID, AuthMethod: AuthMethodToken, Scope: record.Scope}, nil
}

// checkUserPassword re-authenticates a signed-in user. A wrong password is 403, not 401,
// so the frontend does not take it for an ended session.
func checkUserPassword(database *gorm.DB, userID uuid.UUID, password string) error {
	user, err := httpx.FindByID[db.User](database, userID, errUnauthenticated)
	if err != nil {
		return err
	}

	if user.PasswordHash == nil {
		return errInvalidPassword
	}

	ok, err := verifyPassword(password, *user.PasswordHash)
	if err != nil {
		return err
	}

	if !ok {
		return errInvalidPassword
	}

	return nil
}
