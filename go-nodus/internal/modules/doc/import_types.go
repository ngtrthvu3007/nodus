package doc

import (
	"mime/multipart"

	"github.com/google/uuid"
)

type importDocsRequest struct {
	Files    []*multipart.FileHeader `form:"files" binding:"required,min=1,max=20"`
	ParentID string                  `form:"parentId"`
}

type importCreatedDoc struct {
	ID       uuid.UUID `json:"id"`
	Title    string    `json:"title"`
	FileName string    `json:"fileName"`
}

type importFailedFile struct {
	FileName string `json:"fileName"`
	Code     string `json:"code"`
}

type importDocsResponse struct {
	Created []importCreatedDoc `json:"created"`
	Failed  []importFailedFile `json:"failed"`
}
