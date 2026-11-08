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

// @Summary	Get the backlinks and outgoing links of a doc
// @Tags		link
// @Param		id	path		string	true	"Doc ID"	format(uuid)
// @Success	200	{object}	httpx.SuccessBody{data=docLinks}
// @Failure	404	{object}	httpx.ErrorBody
// @Router		/docs/{id}/links [get]
func (handler *Handler) getDocLinks(ginContext *gin.Context) {
	links, err := handler.service.GetDocLinks(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, links)
}

// @Summary	Suggest doc titles in a workspace for [[wiki-links]]
// @Tags		link
// @Param		workspaceId	path		string	true	"Workspace ID"	format(uuid)
// @Param		q			query		string	false	"Title prefix or part"
// @Success	200			{object}	httpx.SuccessBody{data=[]titleSuggestion}
// @Failure	404			{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/docs/autocomplete [get]
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
