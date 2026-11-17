// Package auth is the account module: register, login, sessions, personal access tokens,
// and the middleware that turns a session cookie or a token into a Principal.
package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
)

const sessionCookieName = "nodus_session"

type Handler struct {
	service       *Service
	allowedOrigin string
}

func NewHandler(service *Service, allowedOrigin string) *Handler {
	return &Handler{service: service, allowedOrigin: allowedOrigin}
}

func (handler *Handler) RegisterRoutes(router gin.IRouter) {
	router.POST("/auth/register", httpx.ParseJSONBody[registerRequest](), handler.registerUser)
	router.POST("/auth/login", httpx.ParseJSONBody[loginRequest](), handler.loginUser)

	sessionOnly := router.Group("", RequireSession())
	sessionOnly.POST("/auth/logout", handler.logoutSession)
	sessionOnly.POST("/auth/logout-all", handler.logoutAllSessions)
	sessionOnly.GET("/me", handler.getCurrentUser)
	sessionOnly.GET("/tokens", handler.listTokens)
	sessionOnly.POST("/tokens", httpx.ParseJSONBody[createTokenRequest](), handler.createToken)
	sessionOnly.DELETE("/tokens/:id", httpx.ParseResourceID(errTokenNotFound), handler.revokeToken)
}

// @Summary	Create an account with its personal workspace, and sign in (sets the nodus_session cookie)
// @Tags		auth
// @Param		body		body		registerRequest	true	"Email and password (12-64 characters)"
// @Success	201			{object}	httpx.SuccessBody{data=userResponse}
// @Failure	400,409,429	{object}	httpx.ErrorBody
// @Router		/auth/register [post]
func (handler *Handler) registerUser(ginContext *gin.Context) {
	session, err := handler.service.Register(
		ginContext.Request.Context(),
		httpx.GetBody[registerRequest](ginContext),
		getClientInfo(ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	writeSessionCookie(ginContext, session.sessionToken)
	httpx.WriteOK(ginContext, http.StatusCreated, session.user)
}

// @Summary	Sign in with email and password (sets the nodus_session cookie)
// @Tags		auth
// @Param		body		body		loginRequest	true	"Email and password"
// @Success	200			{object}	httpx.SuccessBody{data=userResponse}
// @Failure	400,401,429	{object}	httpx.ErrorBody
// @Router		/auth/login [post]
func (handler *Handler) loginUser(ginContext *gin.Context) {
	session, err := handler.service.Login(
		ginContext.Request.Context(),
		httpx.GetBody[loginRequest](ginContext),
		getClientInfo(ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	writeSessionCookie(ginContext, session.sessionToken)
	httpx.WriteOK(ginContext, http.StatusOK, session.user)
}

// @Summary	Sign out of this browser
// @Tags		auth
// @Success	204
// @Failure	401,403	{object}	httpx.ErrorBody
// @Router		/auth/logout [post]
func (handler *Handler) logoutSession(ginContext *gin.Context) {
	err := handler.service.Logout(ginContext.Request.Context(), GetPrincipal(ginContext).SessionID)
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	clearSessionCookie(ginContext)
	ginContext.Status(http.StatusNoContent)
}

// @Summary	Sign out of every device, this one included; tokens stay valid
// @Tags		auth
// @Success	204
// @Failure	401,403	{object}	httpx.ErrorBody
// @Router		/auth/logout-all [post]
func (handler *Handler) logoutAllSessions(ginContext *gin.Context) {
	err := handler.service.LogoutAll(ginContext.Request.Context(), GetPrincipal(ginContext).UserID)
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	clearSessionCookie(ginContext)
	ginContext.Status(http.StatusNoContent)
}

// @Summary	Get the signed-in user
// @Tags		auth
// @Success	200		{object}	httpx.SuccessBody{data=userResponse}
// @Failure	401,403	{object}	httpx.ErrorBody
// @Router		/me [get]
func (handler *Handler) getCurrentUser(ginContext *gin.Context) {
	user, err := handler.service.GetUser(ginContext.Request.Context(), GetPrincipal(ginContext).UserID)
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, user)
}

func getClientInfo(ginContext *gin.Context) clientInfo {
	return clientInfo{IP: ginContext.ClientIP(), UserAgent: ginContext.Request.UserAgent()}
}

// The cookie lives as long as the session can (30 days); the server enforces the 14-day idle limit.
func writeSessionCookie(ginContext *gin.Context, sessionToken string) {
	http.SetCookie(ginContext.Writer, &http.Cookie{
		Name:     sessionCookieName,
		Value:    sessionToken,
		Path:     "/",
		MaxAge:   int(sessionLifetime.Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}

func clearSessionCookie(ginContext *gin.Context) {
	http.SetCookie(ginContext.Writer, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}
