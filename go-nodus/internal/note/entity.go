package note

import (
	"time"

	"github.com/google/uuid"
)

type Note struct {
	ID           uuid.UUID  `json:"id"`
	Title        string     `json:"title"`
	Content      string     `json:"content"`
	FolderID     *uuid.UUID `json:"folderId"`
	ParentNoteID *uuid.UUID `json:"parentNoteId"`
	HasChildren  bool       `json:"hasChildren"` // Cột ảo chỉ sinh ra trên Go layer
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type CreateNoteParams struct {
	Title        string
	Content      string
	FolderID     *uuid.UUID
	ParentNoteID *uuid.UUID
}

type UpdateNoteParams struct {
	ID      uuid.UUID
	Title   string
	Content string
}

type MoveNoteParams struct {
	ID           uuid.UUID
	FolderID     *uuid.UUID
	ParentNoteID *uuid.UUID
}
