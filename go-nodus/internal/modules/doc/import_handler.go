package doc

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
)

// @Summary	Import .md files as docs under a folder, a doc or the root; a bad file is reported and does not stop the rest
// @Tags		doc
// @Accept		mpfd
// @Param		workspaceId	path		string	true	"Workspace ID"	format(uuid)
// @Param		files		formData	[]file	true	"1-20 .md files, up to 1 MB each"
// @Param		parentId	formData	string	false	"Folder or doc ID; leave out for the root"
// @Success	200			{object}	httpx.SuccessBody{data=importDocsResponse}
// @Failure	400,404		{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/docs/import [post]
func (handler *Handler) importDocs(ginContext *gin.Context) {
	result, err := handler.service.Import(
		ginContext.Request.Context(),
		httpx.GetWorkspaceID(ginContext),
		httpx.GetBody[importDocsRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, result)
}
