// Package folder is the folder module: create, read, rename, move and delete folders.
package folder

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/tree"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (handler *Handler) RegisterRoutes(router gin.IRouter) {
	router.POST("/workspaces/:workspaceId/folders", httpx.ParseWorkspaceID(), httpx.ParseJSONBody[createFolderRequest](), handler.createFolder)

	folder := router.Group("/folders/:id", httpx.ParseResourceID(errFolderNotFound))
	folder.GET("", handler.getFolder)
	folder.PATCH("", httpx.ParseJSONBody[updateFolderRequest](), handler.updateFolder)
	folder.PATCH("/move", httpx.ParseJSONBodyRequiringKeys[tree.MoveRequest]("parentId", "afterId"), handler.moveFolder)
	folder.DELETE("", handler.deleteFolder)
}

func (handler *Handler) createFolder(ginContext *gin.Context) {
	folder, err := handler.service.Create(
		ginContext.Request.Context(),
		httpx.GetWorkspaceID(ginContext),
		httpx.GetBody[createFolderRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusCreated, folder)
}

func (handler *Handler) getFolder(ginContext *gin.Context) {
	folder, err := handler.service.Get(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, folder)
}

func (handler *Handler) updateFolder(ginContext *gin.Context) {
	folder, err := handler.service.Update(
		ginContext.Request.Context(),
		httpx.GetResourceID(ginContext),
		httpx.GetBody[updateFolderRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, folder)
}

func (handler *Handler) moveFolder(ginContext *gin.Context) {
	moved, err := handler.service.Move(
		ginContext.Request.Context(),
		httpx.GetResourceID(ginContext),
		httpx.GetBody[tree.MoveRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, moved)
}

func (handler *Handler) deleteFolder(ginContext *gin.Context) {
	err := handler.service.Delete(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	ginContext.Status(http.StatusNoContent)
}
