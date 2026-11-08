package link

import (
	"time"

	"github.com/google/uuid"
)

type linkedDoc struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
}

type docLinks struct {
	Backlinks []linkedDoc `json:"backlinks"`
	Outgoing  []linkedDoc `json:"outgoing"`
}

type titleSuggestion struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}
