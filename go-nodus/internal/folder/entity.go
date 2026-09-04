package folder

import (
	"time"

	"github.com/google/uuid"

	"go-nodus/internal/note"
)

type Folder struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	NoteCount int       `json:"noteCount"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateFolderParams struct {
	Name string
}

type FolderDetail struct {
	Folder
	Notes []note.Note `json:"notes"`
}
