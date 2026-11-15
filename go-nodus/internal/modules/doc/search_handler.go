package doc

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
)

var errInvalidSearch = httpx.NewError(http.StatusBadRequest, "invalid_params", "Invalid limit or offset")

// @Summary	Search docs by title and content
// @Tags		doc
// @Param		workspaceId	path		string	true	"Workspace ID"	format(uuid)
// @Param		q			query		string	false	"Text to find in title or content"
// @Param		limit		query		int		false	"Page size, default 20, max 100"
// @Param		offset		query		int		false	"Results to skip, default 0"
// @Success	200			{object}	httpx.SuccessBody{data=searchDocsResponse}
// @Failure	400,404		{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/docs [get]
func (handler *Handler) searchDocs(ginContext *gin.Context) {
	var request searchDocsRequest
	if err := ginContext.ShouldBindQuery(&request); err != nil {
		_ = ginContext.Error(errInvalidSearch)
		return
	}

	response, err := handler.service.Search(
		ginContext.Request.Context(),
		httpx.GetWorkspaceID(ginContext),
		request,
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, response)
}
