package auth

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"go-nodus/internal/httpx"
	"go-nodus/internal/ratelimit"
)

// These tests need a migrated Postgres: TEST_DATABASE_URL=<url> go test ./internal/modules/auth
// Each test runs in a transaction that is rolled back, so nothing is left in the database.

const testPassword = "correct horse battery staple"

var testClient = clientInfo{IP: "203.0.113.7", UserAgent: "auth-test"}

func openTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to a migrated database to run this test")
	}

	database, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		TranslateError: true,
		Logger:         logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("connect database: %v", err)
	}

	// The service's own transactions become savepoints inside this one.
	tx := database.Begin()
	t.Cleanup(func() {
		tx.Rollback()
		if sqlDB, err := database.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	return tx
}

func newLimiters(perEmail int, perIP int) LoginLimiters {
	return LoginLimiters{Email: ratelimit.New(perEmail, time.Minute), IP: ratelimit.New(perIP, time.Minute)}
}

func newTestService(t *testing.T, limiters LoginLimiters) *Service {
	return NewService(openTestDB(t), limiters)
}

// newEmail is unique so tests never collide with rows already in the database.
func newEmail() string {
	return "user-" + uuid.NewString() + "@example.test"
}

func registerTestUser(t *testing.T, service *Service, email string) userResponse {
	t.Helper()

	request := registerRequest{Email: email, Password: testPassword}

	session, err := service.Register(context.Background(), request, testClient)
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	return session.user
}

func login(service *Service, email string, password string) (signedIn, error) {
	return service.Login(context.Background(), loginRequest{Email: email, Password: password}, testClient)
}

func TestRegister(t *testing.T) {
	service := newTestService(t, newLimiters(100, 100))
	ctx := context.Background()
	email := newEmail()

	user := registerTestUser(t, service, "  "+strings.ToUpper(email)+" ")
	if user.Email != email {
		t.Fatalf("email = %q, want it trimmed and lowercased", user.Email)
	}

	var ownedWorkspaces int64
	service.db.Table("workspace_members").Where("user_id = ? AND role = ?", user.ID, RoleOwner).Count(&ownedWorkspaces)
	if ownedWorkspaces != 1 {
		t.Fatalf("owned workspaces = %d, want the personal one", ownedWorkspaces)
	}

	_, err := service.Register(ctx, registerRequest{Email: email, Password: testPassword}, testClient)
	if !errors.Is(err, errEmailTaken) {
		t.Fatalf("second register = %v, want email_taken", err)
	}

	_, err = service.Register(ctx, registerRequest{Email: newEmail(), Password: "short"}, testClient)
	if !errors.Is(err, errWeakPassword) {
		t.Fatalf("short password = %v, want invalid_params", err)
	}
}

func TestLoginWithWrongCredentials(t *testing.T) {
	service := newTestService(t, newLimiters(100, 100))
	email := newEmail()
	registerTestUser(t, service, email)

	_, err := login(service, email, "wrong horse battery staple")
	if !errors.Is(err, errInvalidCredentials) {
		t.Fatalf("wrong password = %v, want invalid_credentials", err)
	}

	_, err = login(service, newEmail(), testPassword)
	if !errors.Is(err, errInvalidCredentials) {
		t.Fatalf("unknown email = %v, want the same invalid_credentials", err)
	}

	first, err := login(service, strings.ToUpper(email), testPassword)
	if err != nil {
		t.Fatalf("right credentials: %v", err)
	}

	second, err := login(service, email, testPassword)
	if err != nil {
		t.Fatalf("right credentials again: %v", err)
	}

	if first.sessionToken == "" || first.sessionToken == second.sessionToken {
		t.Fatal("every login must create a new session")
	}
}

func TestLoginRateLimit(t *testing.T) {
	t.Run("per email", func(t *testing.T) {
		service := newTestService(t, newLimiters(2, 100))
		email := newEmail()
		registerTestUser(t, service, email)

		for range 2 {
			_, err := login(service, email, "wrong horse battery staple")
			if !errors.Is(err, errInvalidCredentials) {
				t.Fatalf("failed login = %v, want invalid_credentials", err)
			}
		}

		_, err := login(service, email, testPassword)
		if !errors.Is(err, httpx.ErrRateLimited) {
			t.Fatalf("login past the limit = %v, want rate_limited even with the right password", err)
		}
	})

	t.Run("per IP", func(t *testing.T) {
		service := newTestService(t, newLimiters(100, 2))
		victim := newEmail()
		registerTestUser(t, service, victim)

		for range 2 {
			_, _ = login(service, newEmail(), testPassword)
		}

		_, err := login(service, victim, testPassword)
		if !errors.Is(err, httpx.ErrRateLimited) {
			t.Fatalf("login from a blocked IP = %v, want rate_limited", err)
		}
	})

	t.Run("success resets the email count", func(t *testing.T) {
		service := newTestService(t, newLimiters(2, 100))
		email := newEmail()
		registerTestUser(t, service, email)

		_, _ = login(service, email, "wrong horse battery staple")

		_, err := login(service, email, testPassword)
		if err != nil {
			t.Fatalf("login under the limit: %v", err)
		}

		_, _ = login(service, email, "wrong horse battery staple")

		_, err = login(service, email, testPassword)
		if err != nil {
			t.Fatalf("a success must reset the count: %v", err)
		}
	})
}

func TestRevokedToken(t *testing.T) {
	service := newTestService(t, newLimiters(100, 100))
	ctx := context.Background()
	user := registerTestUser(t, service, newEmail())

	request := createTokenRequest{Name: "cli", Scope: ScopeDocsRead, Password: "wrong"}

	_, err := service.CreateToken(ctx, user.ID, request)
	if !errors.Is(err, errInvalidPassword) {
		t.Fatalf("create with a wrong password = %v, want invalid_password", err)
	}

	request.Password = testPassword

	created, err := service.CreateToken(ctx, user.ID, request)
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	principal, err := service.ResolveToken(ctx, created.Token)
	isReadToken := principal.UserID == user.ID && principal.Scope == ScopeDocsRead
	if err != nil || !isReadToken {
		t.Fatalf("live token: principal=%+v err=%v", principal, err)
	}

	other := registerTestUser(t, service, newEmail())
	err = service.RevokeToken(ctx, other.ID, created.ID)
	if !errors.Is(err, errTokenNotFound) {
		t.Fatalf("revoke another user's token = %v, want token_not_found", err)
	}

	err = service.RevokeToken(ctx, user.ID, created.ID)
	if err != nil {
		t.Fatalf("revoke: %v", err)
	}

	_, err = service.ResolveToken(ctx, created.Token)
	if !errors.Is(err, errUnauthenticated) {
		t.Fatalf("revoked token = %v, want unauthenticated", err)
	}

	tokens, err := service.ListTokens(ctx, user.ID)
	if err != nil || len(tokens) != 0 {
		t.Fatalf("list after revoke: tokens=%v err=%v, want none", tokens, err)
	}

	err = service.RevokeToken(ctx, user.ID, created.ID)
	if !errors.Is(err, errTokenNotFound) {
		t.Fatalf("revoke twice = %v, want token_not_found", err)
	}
}

// Through the router: what a client with a token actually gets.
func TestTokenThroughMiddleware(t *testing.T) {
	service := newTestService(t, newLimiters(100, 100))
	router := newTestRouter(NewHandler(service, testAllowedOrigin))
	ctx := context.Background()
	user := registerTestUser(t, service, newEmail())

	createToken := func(scope string) createdTokenResponse {
		request := createTokenRequest{Name: scope, Scope: scope, Password: testPassword}

		created, err := service.CreateToken(ctx, user.ID, request)
		if err != nil {
			t.Fatalf("create %s token: %v", scope, err)
		}

		return created
	}

	readToken := createToken(ScopeDocsRead)
	writeToken := createToken(ScopeDocsWrite)
	bearer := func(created createdTokenResponse) []string {
		return []string{"Authorization", "Bearer " + created.Token}
	}

	recorder := sendRequest(router, http.MethodGet, "/probe", bearer(readToken)...)
	if recorder.Code != http.StatusOK {
		t.Fatalf("docs:read GET = %d, want 200", recorder.Code)
	}

	// The middleware lets a docs:read write through: workspace.CanAccess refuses it after the membership check,
	// so a non-member still gets 404 first (see the access matrix in cmd/api).
	recorder = sendRequest(router, http.MethodPost, "/probe", bearer(readToken)...)
	if recorder.Code != http.StatusOK {
		t.Fatalf("docs:read POST through the middleware = %d %q, want 200", recorder.Code, recorder.Body.String())
	}

	recorder = sendRequest(router, http.MethodPost, "/probe", bearer(writeToken)...)
	if recorder.Code != http.StatusOK {
		t.Fatalf("docs:write POST = %d, want 200", recorder.Code)
	}

	recorder = sendRequest(router, http.MethodGet, "/me", bearer(writeToken)...)
	if recorder.Code != http.StatusForbidden || getErrorCode(t, recorder) != "forbidden" {
		t.Fatalf("token on /me = %d %q, want 403 forbidden", recorder.Code, recorder.Body.String())
	}

	err := service.RevokeToken(ctx, user.ID, writeToken.ID)
	if err != nil {
		t.Fatalf("revoke: %v", err)
	}

	recorder = sendRequest(router, http.MethodGet, "/probe", bearer(writeToken)...)
	if recorder.Code != http.StatusUnauthorized || getErrorCode(t, recorder) != "unauthenticated" {
		t.Fatalf("revoked token = %d %q, want 401 unauthenticated", recorder.Code, recorder.Body.String())
	}

	session, err := login(service, user.Email, testPassword)
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	recorder = sendRequest(router, http.MethodGet, "/me", "Cookie", sessionCookieName+"="+session.sessionToken)
	if recorder.Code != http.StatusOK {
		t.Fatalf("session on /me = %d, want 200", recorder.Code)
	}
}
