package notelink

import (
	"time"

	"github.com/google/uuid"
)

type LinkedNote struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
}

type NoteLinks struct {
	Backlinks []LinkedNote `json:"backlinks"`
	Outgoing  []LinkedNote `json:"outgoing"`
}

type NoteTitleSuggestion struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}
