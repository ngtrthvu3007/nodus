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

// @Summary	Create a folder
// @Tags		folder
// @Param		workspaceId	path		string				true	"Workspace ID"	format(uuid)
// @Param		body		body		createFolderRequest	true	"Folder"
// @Success	201			{object}	httpx.SuccessBody{data=folderResponse}
// @Failure	400,404,409	{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/folders [post]
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

// @Summary	Get a folder with its direct children
// @Tags		folder
// @Param		id	path		string	true	"Folder ID"	format(uuid)
// @Success	200	{object}	httpx.SuccessBody{data=folderDetail}
// @Failure	404	{object}	httpx.ErrorBody
// @Router		/folders/{id} [get]
func (handler *Handler) getFolder(ginContext *gin.Context) {
	folder, err := handler.service.Get(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, folder)
}

// @Summary	Update the name and/or description of a folder
// @Tags		folder
// @Param		id			path		string				true	"Folder ID"	format(uuid)
// @Param		body		body		updateFolderRequest	true	"Fields to change"
// @Success	200			{object}	httpx.SuccessBody{data=folderResponse}
// @Failure	400,404,409	{object}	httpx.ErrorBody
// @Router		/folders/{id} [patch]
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

// @Summary	Move a folder under another folder or to the root
// @Tags		folder
// @Param		id			path		string				true	"Folder ID"	format(uuid)
// @Param		body		body		tree.MoveRequest	true	"Target parent and position"
// @Success	200			{object}	httpx.SuccessBody{data=tree.Moved}
// @Failure	400,404,409	{object}	httpx.ErrorBody
// @Router		/folders/{id}/move [patch]
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

// @Summary	Delete a folder and everything inside it
// @Tags		folder
// @Param		id	path	string	true	"Folder ID"	format(uuid)
// @Success	204
// @Failure	404	{object}	httpx.ErrorBody
// @Router		/folders/{id} [delete]
func (handler *Handler) deleteFolder(ginContext *gin.Context) {
	err := handler.service.Delete(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	ginContext.Status(http.StatusNoContent)
}
