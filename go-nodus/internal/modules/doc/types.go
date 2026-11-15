package doc

import (
	"time"

	"github.com/google/uuid"
)

type createDocRequest struct {
	Title    string     `json:"title" binding:"required"`
	Content  string     `json:"content"`
	ParentID *uuid.UUID `json:"parentId"`
}

type updateDocRequest struct {
	Content string `json:"content"`
	Version int    `json:"version" binding:"required"`
}

type renameDocRequest struct {
	Title string `json:"title" binding:"required"`
}

type docConflictDetail struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Version int    `json:"version"`
}

type docResponse struct {
	ID       uuid.UUID  `json:"id"`
	Title    string     `json:"title"`
	Content  string     `json:"content"`
	ParentID *uuid.UUID `json:"parentId"`
	Position int64      `json:"position"`
}

type docRef struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}

type searchDocsRequest struct {
	Query  string `form:"q"`
	Limit  int    `form:"limit,default=20" binding:"min=1"`
	Offset int    `form:"offset" binding:"min=0"`
}

type searchDocResult struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Path      string    `json:"path"`
	Snippet   string    `json:"snippet"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type searchDocsResponse struct {
	Items   []searchDocResult `json:"items"`
	Limit   int               `json:"limit"`
	Offset  int               `json:"offset"`
	HasMore bool              `json:"hasMore"`
}

type docDetail struct {
	ID       uuid.UUID  `json:"id"`
	Title    string     `json:"title"`
	Content  string     `json:"content"`
	Version  int        `json:"version"`
	ParentID *uuid.UUID `json:"parentId"`
	Prev     *docRef    `json:"prev"`
	Next     *docRef    `json:"next"`
}
