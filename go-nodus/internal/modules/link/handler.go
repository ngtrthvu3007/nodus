// Package link is the wiki-link module: backlinks, outgoing links and title autocomplete.
package link

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
	router.GET("/docs/:id/links", httpx.ParseResourceID(httpx.ErrDocNotFound), handler.getDocLinks)
	router.GET("/workspaces/:workspaceId/docs/autocomplete", httpx.ParseWorkspaceID(), handler.autocompleteTitles)
}

func (handler *Handler) getDocLinks(ginContext *gin.Context) {
	links, err := handler.service.GetDocLinks(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, links)
}

func (handler *Handler) autocompleteTitles(ginContext *gin.Context) {
	suggestions, err := handler.service.AutocompleteTitles(
		ginContext.Request.Context(),
		httpx.GetWorkspaceID(ginContext),
		ginContext.Query("q"),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, suggestions)
}
