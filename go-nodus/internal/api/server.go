// Package api is the whole HTTP API: server.go holds the shared plumbing, and each domain lives in one file
// (notes.go, folders.go, links.go) as a handler struct with its routes, handlers and rules.
// Handlers receive their dependencies through constructors; internal/app wires them.
package api

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// Module is one domain of the API (NoteHandler, FolderHandler, LinkHandler) that registers its own routes.
type Module interface {
	RegisterRoutes(r gin.IRouter)
}

// NewRouter builds the Gin engine with the shared middleware and the routes of every module.
func NewRouter(allowedOrigin string, modules ...Module) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), cors(allowedOrigin))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	for _, module := range modules {
		module.RegisterRoutes(router)
	}

	return router
}

// ---------- Responses: {success, data} and {success: false, error: {code, message}} ----------

type successBody struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
}

type errorBody struct {
	Success bool       `json:"success"`
	Error   errorField `json:"error"`
}

type errorField struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type messageData struct {
	Message string `json:"message"`
}

func writeOK(c *gin.Context, status int, data any) {
	c.JSON(status, successBody{Success: true, Data: data})
}

func fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, errorBody{Error: errorField{Code: code, Message: message}})
}

// apiError is a rule violation: the HTTP status and a stable code clients can rely on.
type apiError struct {
	status  int
	code    string
	message string
}

func (e *apiError) Error() string {
	return e.message
}

// writeError answers an apiError as-is; anything else is logged and answered with a generic 500,
// so database details never reach the client.
func writeError(c *gin.Context, err error) {
	var apiErr *apiError
	if errors.As(err, &apiErr) {
		fail(c, apiErr.status, apiErr.code, apiErr.message)
		return
	}

	slog.ErrorContext(c.Request.Context(), "request failed", "method", c.Request.Method, "route", c.FullPath(), "err", err)
	fail(c, http.StatusInternalServerError, "internal", "Internal error")
}

// ---------- Requests ----------

// bindJSON decodes and validates the body (`binding` tags); on failure it answers 400.
func bindJSON(c *gin.Context, dst any) bool {
	err := c.ShouldBindJSON(dst)
	if err == nil {
		return true
	}

	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		fail(c, http.StatusBadRequest, "invalid_params", "Invalid params")
	} else {
		fail(c, http.StatusBadRequest, "invalid_body", "Invalid body")
	}
	return false
}

// pathID reads the :id parameter. A malformed id matches no resource, so it answers notFound (404).
func pathID(c *gin.Context, notFound *apiError) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		writeError(c, notFound)
		return uuid.UUID{}, false
	}
	return id, true
}

// likePattern escapes LIKE wildcards in user input so "%" or "_" match literally.
func likePattern(prefix, value, suffix string) string {
	escaped := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
	return prefix + escaped + suffix
}

// ---------- CORS ----------

// cors lets the frontend at allowedOrigin call the API from the browser, with cookies (for sessions).
func cors(allowedOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.Writer.Header()
		header.Add("Vary", "Origin")

		if c.GetHeader("Origin") == allowedOrigin {
			header.Set("Access-Control-Allow-Origin", allowedOrigin)
			header.Set("Access-Control-Allow-Credentials", "true")
			header.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			header.Set("Access-Control-Allow-Headers", "Content-Type")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
