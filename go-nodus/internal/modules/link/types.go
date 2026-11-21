package link

import (
	"github.com/google/uuid"
)

type backlink struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
	Path  string    `json:"path"`
}

type linkTarget struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}

type outgoingLink struct {
	Ref string      `json:"ref"`
	Doc *linkTarget `json:"doc"`
}

type docLinks struct {
	Backlinks []backlink     `json:"backlinks"`
	Outgoing  []outgoingLink `json:"outgoing"`
}

type titleSuggestion struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
	Path  string    `json:"path"`
	Ref   string    `json:"ref"`
}

type heading struct {
	Level int    `json:"level"`
	Text  string `json:"text"`
}
