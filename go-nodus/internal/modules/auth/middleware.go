package auth

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
)

// Routes answered without signing in. An unknown route (empty path) passes so it gets its 404.
var publicRoutes = map[string]bool{
	"":               true,
	"/health":        true,
	"/swagger/*any":  true,
	"/auth/register": true,
	"/auth/login":    true,
}

// Authenticate runs on every route. It checks the Origin of writes, then reads `Authorization: Bearer <token>`
// or the nodus_session cookie, answers 401 when neither is valid, and stores the Principal for the handlers.
func (handler *Handler) Authenticate() gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		// Before the public routes return: login and register are writes too (login CSRF).
		err := handler.checkOrigin(ginContext)
		if err != nil {
			httpx.AbortWithError(ginContext, err)
			return
		}

		if publicRoutes[ginContext.FullPath()] {
			return
		}

		principal, err := handler.resolvePrincipal(ginContext)
		if err != nil {
			httpx.AbortWithError(ginContext, err)
			return
		}

		err = checkScope(ginContext.Request.Method, principal)
		if err != nil {
			httpx.AbortWithError(ginContext, err)
			return
		}

		ginContext.Set(principalKey, principal)
	}
}

// RequireSession refuses tokens: account, token and workspace management are for the browser only.
func RequireSession() gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		if GetPrincipal(ginContext).AuthMethod != AuthMethodSession {
			httpx.AbortWithError(ginContext, httpx.ErrForbidden)
		}
	}
}

func (handler *Handler) resolvePrincipal(ginContext *gin.Context) (Principal, error) {
	ctx := ginContext.Request.Context()

	header := ginContext.GetHeader("Authorization")
	if header != "" {
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok {
			return Principal{}, errUnauthenticated
		}

		return handler.service.ResolveToken(ctx, token)
	}

	sessionToken, err := ginContext.Cookie(sessionCookieName)
	if err != nil || sessionToken == "" {
		return Principal{}, errUnauthenticated
	}

	return handler.service.ResolveSession(ctx, sessionToken)
}

// checkOrigin: a write sent by a browser must come from the frontend or the API itself (CSRF, ADR-002).
// It holds for every route, public ones included. Tools (curl, MCP) send no Origin and pass.
func (handler *Handler) checkOrigin(ginContext *gin.Context) error {
	origin := ginContext.GetHeader("Origin")
	if isReadMethod(ginContext.Request.Method) || origin == "" || handler.isTrustedOrigin(ginContext, origin) {
		return nil
	}

	return httpx.ErrForbidden
}

// checkScope: a docs:read token only reads.
func checkScope(method string, principal Principal) error {
	if isReadMethod(method) || principal.canWrite() {
		return nil
	}

	return errInsufficientScope
}

// The frontend, or the API's own pages (Swagger UI): a site on another origin cannot send either value.
func (handler *Handler) isTrustedOrigin(ginContext *gin.Context, origin string) bool {
	if origin == handler.allowedOrigin {
		return true
	}

	parsed, err := url.Parse(origin)

	return err == nil && parsed.Host == ginContext.Request.Host
}

func isReadMethod(method string) bool {
	return method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions
}
