// Package db holds the GORM models, the single source of the schema (Atlas generates migrations from them).
package db

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Workspace owns every folder and doc. Their foreign keys use NO ACTION until workspace deletion exists.
type Workspace struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name      string    `gorm:"not null"`
	CreatedAt time.Time `gorm:"not null;default:now()"`
}

// Folder holds docs and other folders. ParentFolderID nil = root.
type Folder struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	WorkspaceID    uuid.UUID  `gorm:"type:uuid;not null;index:idx_folders_position,priority:1"`
	ParentFolderID *uuid.UUID `gorm:"type:uuid;index:idx_folders_position,priority:2"`
	Name           string     `gorm:"not null"`
	Description    string     `gorm:"not null;default:''"`
	Position       int64      `gorm:"not null;index:idx_folders_position,priority:3"`
	CreatedAt      time.Time  `gorm:"not null;default:now()"`
	UpdatedAt      time.Time  `gorm:"not null;default:now()"`

	// Relations only declare foreign keys for Atlas.
	Workspace    *Workspace
	ParentFolder *Folder `gorm:"constraint:OnDelete:CASCADE"`
}

// Doc sits at the root, in a folder (FolderID) or in another doc (ParentDocID); never both.
// The migration adds the CHECK and the case-insensitive unique title index by hand.
type Doc struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	WorkspaceID uuid.UUID      `gorm:"type:uuid;not null;index:idx_docs_folder_position,priority:1;index:idx_docs_parent_position,priority:1"`
	FolderID    *uuid.UUID     `gorm:"type:uuid;index:idx_docs_folder_position,priority:2"`
	ParentDocID *uuid.UUID     `gorm:"type:uuid;index:idx_docs_parent_position,priority:2"`
	Title       string         `gorm:"not null"`
	Content     string         `gorm:"not null;default:''"`
	Position    int64          `gorm:"not null;index:idx_docs_folder_position,priority:3;index:idx_docs_parent_position,priority:3"`
	CreatedAt   time.Time      `gorm:"not null;default:now()"`
	UpdatedAt   time.Time      `gorm:"not null;default:now()"`
	DeletedAt   gorm.DeletedAt `gorm:"index"`

	// Relations only declare foreign keys for Atlas.
	Workspace *Workspace
	Folder    *Folder `gorm:"constraint:OnDelete:CASCADE"`
	ParentDoc *Doc    `gorm:"constraint:OnDelete:CASCADE"`
}

// DocLink is a [[wiki-link]] from one doc's content to another doc, rebuilt on every save.
type DocLink struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	SourceDocID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_doc_links_source_target,priority:1"`
	TargetDocID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_doc_links_source_target,priority:2;index"`
	CreatedAt   time.Time `gorm:"not null;default:now()"`

	SourceDoc *Doc `gorm:"foreignKey:SourceDocID;constraint:OnDelete:CASCADE"`
	TargetDoc *Doc `gorm:"foreignKey:TargetDocID;constraint:OnDelete:CASCADE"`
}
