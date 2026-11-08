// Package doc is the doc module: create, read, update, move and delete docs.
package doc

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
	router.POST("/workspaces/:workspaceId/docs", httpx.ParseWorkspaceID(), httpx.ParseJSONBody[createDocRequest](), handler.createDoc)

	doc := router.Group("/docs/:id", httpx.ParseResourceID(httpx.ErrDocNotFound))
	doc.GET("", handler.getDoc)
	doc.PUT("", httpx.ParseJSONBody[updateDocRequest](), handler.updateDoc)
	doc.PATCH("/move", httpx.ParseJSONBodyRequiringKeys[tree.MoveRequest]("parentId", "afterId"), handler.moveDoc)
	doc.DELETE("", handler.deleteDoc)
}

// @Summary	Create a doc
// @Tags		doc
// @Param		workspaceId	path		string				true	"Workspace ID"	format(uuid)
// @Param		body		body		createDocRequest	true	"Doc"
// @Success	201			{object}	httpx.SuccessBody{data=docResponse}
// @Failure	400,404,409	{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/docs [post]
func (handler *Handler) createDoc(ginContext *gin.Context) {
	doc, err := handler.service.Create(
		ginContext.Request.Context(),
		httpx.GetWorkspaceID(ginContext),
		httpx.GetBody[createDocRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusCreated, doc)
}

// @Summary	Get a doc with the previous and next doc in reading order
// @Tags		doc
// @Param		id	path		string	true	"Doc ID"	format(uuid)
// @Success	200	{object}	httpx.SuccessBody{data=docDetail}
// @Failure	404	{object}	httpx.ErrorBody
// @Router		/docs/{id} [get]
func (handler *Handler) getDoc(ginContext *gin.Context) {
	doc, err := handler.service.Get(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, doc)
}

// @Summary	Replace the title and content of a doc
// @Tags		doc
// @Param		id			path		string				true	"Doc ID"	format(uuid)
// @Param		body		body		updateDocRequest	true	"Title and content"
// @Success	200			{object}	httpx.SuccessBody{data=docDetail}
// @Failure	400,404,409	{object}	httpx.ErrorBody
// @Router		/docs/{id} [put]
func (handler *Handler) updateDoc(ginContext *gin.Context) {
	doc, err := handler.service.Update(
		ginContext.Request.Context(),
		httpx.GetResourceID(ginContext),
		httpx.GetBody[updateDocRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, doc)
}

// @Summary	Move a doc into a folder, under another doc, or to the root
// @Tags		doc
// @Param		id			path		string				true	"Doc ID"	format(uuid)
// @Param		body		body		tree.MoveRequest	true	"Target parent and position"
// @Success	200			{object}	httpx.SuccessBody{data=tree.Moved}
// @Failure	400,404,409	{object}	httpx.ErrorBody
// @Router		/docs/{id}/move [patch]
func (handler *Handler) moveDoc(ginContext *gin.Context) {
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

// @Summary	Delete a doc and every doc under it
// @Tags		doc
// @Param		id	path	string	true	"Doc ID"	format(uuid)
// @Success	204
// @Failure	404	{object}	httpx.ErrorBody
// @Router		/docs/{id} [delete]
func (handler *Handler) deleteDoc(ginContext *gin.Context) {
	err := handler.service.Delete(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	ginContext.Status(http.StatusNoContent)
}
