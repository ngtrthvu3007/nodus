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

func (handler *Handler) getDoc(ginContext *gin.Context) {
	doc, err := handler.service.Get(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, doc)
}

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

func (handler *Handler) deleteDoc(ginContext *gin.Context) {
	err := handler.service.Delete(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	ginContext.Status(http.StatusNoContent)
}
