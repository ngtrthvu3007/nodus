package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
)

const (
	testAllowedOrigin = "http://app.test"
	testAPIHost       = "api.test"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

// probeModule stands for any protected route: it answers 200 once the middleware lets the request through.
type probeModule struct{}

func (probeModule) RegisterRoutes(router gin.IRouter) {
	answerOK := func(ginContext *gin.Context) { ginContext.Status(http.StatusOK) }

	router.GET("/probe", answerOK)
	router.POST("/probe", answerOK)
}

func newTestRouter(handler *Handler) *gin.Engine {
	return httpx.NewRouter(testAllowedOrigin, handler.Authenticate(), handler, probeModule{})
}

// sendRequest calls the router; headers is a flat list of name, value pairs.
func sendRequest(router http.Handler, method string, path string, headers ...string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, "http://"+testAPIHost+path, nil)
	for i := 0; i+1 < len(headers); i += 2 {
		request.Header.Set(headers[i], headers[i+1])
	}

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	return recorder
}

func getErrorCode(t *testing.T, recorder *httptest.ResponseRecorder) string {
	t.Helper()

	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}

	err := json.Unmarshal(recorder.Body.Bytes(), &body)
	if err != nil {
		t.Fatalf("response is not the error envelope: %q", recorder.Body.String())
	}

	return body.Error.Code
}

func newTestContext(method string, origin string) *gin.Context {
	ginContext, _ := gin.CreateTestContext(httptest.NewRecorder())
	ginContext.Request = httptest.NewRequest(method, "http://"+testAPIHost+"/probe", nil)
	if origin != "" {
		ginContext.Request.Header.Set("Origin", origin)
	}

	return ginContext
}

func TestCheckScope(t *testing.T) {
	session := Principal{AuthMethod: AuthMethodSession}
	readToken := Principal{AuthMethod: AuthMethodToken, Scope: ScopeDocsRead}
	writeToken := Principal{AuthMethod: AuthMethodToken, Scope: ScopeDocsWrite}

	cases := []struct {
		name      string
		principal Principal
		method    string
		want      error
	}{
		{"docs:read token reads", readToken, http.MethodGet, nil},
		{"docs:read token creates", readToken, http.MethodPost, errInsufficientScope},
		{"docs:read token updates", readToken, http.MethodPut, errInsufficientScope},
		{"docs:read token moves", readToken, http.MethodPatch, errInsufficientScope},
		{"docs:read token deletes", readToken, http.MethodDelete, errInsufficientScope},
		{"docs:write token writes", writeToken, http.MethodPost, nil},
		{"session writes", session, http.MethodDelete, nil},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			err := checkScope(testCase.method, testCase.principal)
			if !errors.Is(err, testCase.want) {
				t.Fatalf("checkScope = %v, want %v", err, testCase.want)
			}
		})
	}
}

func TestCheckOrigin(t *testing.T) {
	handler := &Handler{allowedOrigin: testAllowedOrigin}

	cases := []struct {
		name   string
		method string
		origin string
		want   error
	}{
		{"write without Origin (curl, MCP)", http.MethodPost, "", nil},
		{"write from the frontend", http.MethodPost, testAllowedOrigin, nil},
		{"write from the API itself (Swagger UI)", http.MethodPost, "http://" + testAPIHost, nil},
		{"write from another site", http.MethodPost, "http://evil.test", httpx.ErrForbidden},
		{"delete from another site", http.MethodDelete, "http://evil.test", httpx.ErrForbidden},
		{"read from another site", http.MethodGet, "http://evil.test", nil},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			err := handler.checkOrigin(newTestContext(testCase.method, testCase.origin))
			if !errors.Is(err, testCase.want) {
				t.Fatalf("checkOrigin = %v, want %v", err, testCase.want)
			}
		})
	}
}

// The middleware itself refuses a write from another site before it lets public routes through,
// so login and register stay protected even if the CORS layer changes.
func TestAuthenticateChecksOriginBeforePublicRoutes(t *testing.T) {
	authenticate := NewHandler(&Service{}, testAllowedOrigin).Authenticate()

	// A test context has no matched route (empty path), which is in publicRoutes.
	foreign := newTestContext(http.MethodPost, "http://evil.test")
	authenticate(foreign)

	if !foreign.IsAborted() || !errors.Is(foreign.Errors.Last(), httpx.ErrForbidden) {
		t.Fatal("a write from another site must be refused before the public-route shortcut")
	}

	trusted := newTestContext(http.MethodPost, testAllowedOrigin)
	authenticate(trusted)

	if trusted.IsAborted() {
		t.Fatal("a write from the frontend must pass on a public route")
	}
}

// Through the whole router (CORS, then Authenticate): a foreign login or register never reaches the handler.
// An allowed request does, and gets 400 for its empty body, so no database is needed.
func TestOriginOnPublicRoutes(t *testing.T) {
	router := newTestRouter(NewHandler(&Service{}, testAllowedOrigin))

	for _, path := range []string{"/auth/login", "/auth/register"} {
		recorder := sendRequest(router, http.MethodPost, path, "Origin", "http://evil.test")
		if recorder.Code != http.StatusForbidden {
			t.Fatalf("%s from another site = %d, want 403", path, recorder.Code)
		}

		for _, origin := range []string{testAllowedOrigin, "http://" + testAPIHost, ""} {
			recorder = sendRequest(router, http.MethodPost, path, "Origin", origin)
			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("%s with Origin %q = %d, want it to reach the handler (400)", path, origin, recorder.Code)
			}
		}
	}
}

func TestRequireSession(t *testing.T) {
	tokenContext := newTestContext(http.MethodGet, "")
	tokenContext.Set(principalKey, Principal{AuthMethod: AuthMethodToken, Scope: ScopeDocsWrite})
	RequireSession()(tokenContext)

	if !tokenContext.IsAborted() || !errors.Is(tokenContext.Errors.Last(), httpx.ErrForbidden) {
		t.Fatal("a token on a session-only route must be refused with forbidden")
	}

	sessionContext := newTestContext(http.MethodGet, "")
	sessionContext.Set(principalKey, Principal{AuthMethod: AuthMethodSession})
	RequireSession()(sessionContext)

	if sessionContext.IsAborted() {
		t.Fatal("a session must pass")
	}
}

// These requests are refused before any database lookup, so the service needs no database.
func TestAuthenticateWithoutValidCredentials(t *testing.T) {
	router := newTestRouter(NewHandler(&Service{}, testAllowedOrigin))

	cases := []struct {
		name    string
		headers []string
	}{
		{"no credentials", nil},
		{"empty session cookie", []string{"Cookie", sessionCookieName + "="}},
		{"not a Bearer header", []string{"Authorization", "Basic abc"}},
		{"Bearer value that is not a token", []string{"Authorization", "Bearer session-value"}},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			recorder := sendRequest(router, http.MethodGet, "/probe", testCase.headers...)

			if recorder.Code != http.StatusUnauthorized || getErrorCode(t, recorder) != "unauthenticated" {
				t.Fatalf("got %d %q, want 401 unauthenticated", recorder.Code, recorder.Body.String())
			}
		})
	}

	recorder := sendRequest(router, http.MethodGet, "/health")
	if recorder.Code != http.StatusOK {
		t.Fatalf("/health is public, got %d", recorder.Code)
	}
}
