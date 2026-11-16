// Package export is the export module: download a doc, several docs or a folder as markdown files.
package export

import (
	"log/slog"
	"mime"
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
	router.GET("/docs/:id/export", httpx.ParseResourceID(httpx.ErrDocNotFound), handler.exportDoc)
	router.GET("/folders/:id/export", httpx.ParseResourceID(errFolderNotFound), handler.exportFolder)
	router.POST("/workspaces/:workspaceId/docs/export", httpx.ParseWorkspaceID(), httpx.ParseJSONBody[exportDocsRequest](), handler.exportDocs)
}

// @Summary	Download one doc as a .md file (its children are not included)
// @Tags		export
// @Produce	text/markdown
// @Param		id	path	string	true	"Doc ID"	format(uuid)
// @Success	200	{file}		file
// @Failure	404	{object}	httpx.ErrorBody
// @Router		/docs/{id}/export [get]
func (handler *Handler) exportDoc(ginContext *gin.Context) {
	file, err := handler.service.BuildDocFile(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	sendFile(ginContext, file)
}

// @Summary	Download a folder and its branch as a .zip that keeps the tree
// @Tags		export
// @Produce	application/zip
// @Param		id	path	string	true	"Folder ID"	format(uuid)
// @Success	200	{file}		file
// @Failure	404	{object}	httpx.ErrorBody
// @Router		/folders/{id}/export [get]
func (handler *Handler) exportFolder(ginContext *gin.Context) {
	file, err := handler.service.BuildFolderZip(ginContext.Request.Context(), httpx.GetResourceID(ginContext))
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	sendFile(ginContext, file)
}

// @Summary	Download the chosen docs as a flat .zip (their children are not included)
// @Tags		export
// @Accept		json
// @Produce	application/zip
// @Param		workspaceId	path	string				true	"Workspace ID"	format(uuid)
// @Param		body		body	exportDocsRequest	true	"Doc IDs"
// @Success	200			{file}		file
// @Failure	400,404		{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/docs/export [post]
func (handler *Handler) exportDocs(ginContext *gin.Context) {
	file, err := handler.service.BuildDocsZip(
		ginContext.Request.Context(),
		httpx.GetWorkspaceID(ginContext),
		httpx.GetBody[exportDocsRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	sendFile(ginContext, file)
}

// The file was checked before this point, so a failure here is mid-stream: the headers are gone and the response can
// no longer be JSON, so it is only logged and the download ends early.
func sendFile(ginContext *gin.Context, file exportFile) {
	ginContext.Header("Content-Type", file.ContentType)
	disposition := mime.FormatMediaType("attachment", map[string]string{"filename": file.Name})
	ginContext.Header(httpx.HeaderContentDisposition, disposition)
	ginContext.Status(http.StatusOK)

	err := file.Write(ginContext.Writer)
	if err != nil {
		slog.ErrorContext(
			ginContext.Request.Context(),
			"export failed while streaming",
			"route", ginContext.FullPath(),
			"err", err,
		)
	}
}
