// Package tree is the workspace tree and the rules folders and docs share.
package tree

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/workspace"
)

type Handler struct {
	service *Service
	guard   *workspace.Guard
}

func NewHandler(service *Service, guard *workspace.Guard) *Handler {
	return &Handler{service: service, guard: guard}
}

func (handler *Handler) RegisterRoutes(router gin.IRouter) {
	router.GET("/workspaces/:workspaceId/tree", httpx.ParseWorkspaceID(), handler.guard.RequireRead(), handler.getTree)
}

// @Summary	Get the workspace tree
// @Tags		tree
// @Param		workspaceId	path		string	true	"Workspace ID"	format(uuid)
// @Success	200			{object}	httpx.SuccessBody{data=[]Node}
// @Failure	401,404		{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/tree [get]
func (handler *Handler) getTree(ginContext *gin.Context) {
	nodes, err := handler.service.GetTree(ginContext.Request.Context(), httpx.GetWorkspaceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, nodes)
}
