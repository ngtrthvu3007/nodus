// Package httpx is the shared HTTP plumbing: router, response, errors, middleware.
package httpx

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Module interface {
	RegisterRoutes(router gin.IRouter)
}

func NewRouter(allowedOrigin string, modules ...Module) *gin.Engine {
	corsConfig := cors.Config{
		AllowOrigins: []string{allowedOrigin},
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS",
		},
		AllowHeaders:     []string{"Content-Type"},
		AllowCredentials: true,
	}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), cors.New(corsConfig), handleErrors())

	router.GET("/health", func(ginContext *gin.Context) {
		ginContext.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	for _, module := range modules {
		module.RegisterRoutes(router)
	}

	return router
}

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

func WriteOK(ginContext *gin.Context, status int, data any) {
	ginContext.JSON(status, successBody{Success: true, Data: data})
}

func writeErrorResponse(ginContext *gin.Context, status int, code string, message string) {
	body := errorBody{Error: errorField{Code: code, Message: message}}
	ginContext.AbortWithStatusJSON(status, body)
}

type Error struct {
	Status  int
	Code    string
	Message string
}

func NewError(status int, code string, message string) *Error {
	return &Error{Status: status, Code: code, Message: message}
}

func (apiErr *Error) Error() string {
	return apiErr.Message
}

var (
	ErrWorkspaceNotFound = NewError(http.StatusNotFound, "workspace_not_found", "Workspace is not found")
	ErrDocNotFound       = NewError(http.StatusNotFound, "doc_not_found", "Doc is not found")
)

// Handlers record errors with ginContext.Error(err) and return; this answers them.
func handleErrors() gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		ginContext.Next()

		if len(ginContext.Errors) == 0 {
			return
		}

		err := ginContext.Errors.Last().Err

		var apiErr *Error
		if errors.As(err, &apiErr) {
			writeErrorResponse(ginContext, apiErr.Status, apiErr.Code, apiErr.Message)
			return
		}

		slog.ErrorContext(
			ginContext.Request.Context(),
			"request failed",
			"method", ginContext.Request.Method,
			"route", ginContext.FullPath(),
			"err", err,
		)

		writeErrorResponse(ginContext, http.StatusInternalServerError, "internal", "Internal error")
	}
}

func AbortWithError(ginContext *gin.Context, err error) {
	_ = ginContext.Error(err)
	ginContext.Abort()
}

func FindByID[T any](tx *gorm.DB, id uuid.UUID, notFound *Error) (*T, error) {
	var model T

	err := tx.Where("id = ?", id).First(&model).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, notFound
	}

	return &model, err
}
