// Package db holds the GORM models — the single source of the database schema.
// Atlas generates migrations from them (`make migrate-diff`); never call AutoMigrate.
package db

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Folder struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	CreatedAt time.Time `gorm:"not null;default:now()" json:"createdAt"`
	UpdatedAt time.Time `gorm:"not null;default:now()" json:"updatedAt"`

	// Computed in queries (root notes in the folder); not a column.
	NoteCount int `gorm:"->;-:migration" json:"noteCount"`
}

// Note is a root note (ParentNoteID nil, optional FolderID) or a child of a root note
// (FolderID always nil: a child inherits its parent's folder).
type Note struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title        string         `gorm:"not null" json:"title"`
	Content      string         `gorm:"not null;default:''" json:"content"`
	FolderID     *uuid.UUID     `gorm:"type:uuid;index" json:"folderId"`
	ParentNoteID *uuid.UUID     `gorm:"type:uuid;index" json:"parentNoteId"`
	CreatedAt    time.Time      `gorm:"not null;default:now()" json:"createdAt"`
	UpdatedAt    time.Time      `gorm:"not null;default:now();index:,sort:desc" json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Computed in queries (EXISTS on child notes); not a column.
	HasChildren bool `gorm:"->;-:migration" json:"hasChildren"`

	// Relations exist only to declare foreign keys for Atlas.
	Folder     *Folder `gorm:"constraint:OnDelete:CASCADE" json:"-"`
	ParentNote *Note   `gorm:"constraint:OnDelete:CASCADE" json:"-"`
}

// NoteLink is a [[wiki-link]] from one note's content to another note, rebuilt on every save.
type NoteLink struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SourceNoteID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_note_links_source_target,priority:1" json:"sourceNoteId"`
	TargetNoteID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_note_links_source_target,priority:2;index" json:"targetNoteId"`
	CreatedAt    time.Time `gorm:"not null;default:now()" json:"createdAt"`

	SourceNote *Note `gorm:"foreignKey:SourceNoteID;constraint:OnDelete:CASCADE" json:"-"`
	TargetNote *Note `gorm:"foreignKey:TargetNoteID;constraint:OnDelete:CASCADE" json:"-"`
}
