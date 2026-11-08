// Package tree is the workspace tree and the rules folders and docs share.
package tree

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (handler *Handler) RegisterRoutes(router gin.IRouter) {
	router.GET("/workspaces/:workspaceId/tree", httpx.ParseWorkspaceID(), handler.getTree)
}

func (handler *Handler) getTree(ginContext *gin.Context) {
	nodes, err := handler.service.GetTree(ginContext.Request.Context(), httpx.GetWorkspaceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, nodes)
}
