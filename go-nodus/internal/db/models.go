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
	Version     int            `gorm:"not null;default:1"`
	Position    int64          `gorm:"not null;index:idx_docs_folder_position,priority:3;index:idx_docs_parent_position,priority:3"`
	CreatedAt   time.Time      `gorm:"not null;default:now()"`
	UpdatedAt   time.Time      `gorm:"not null;default:now()"`
	DeletedAt   gorm.DeletedAt `gorm:"index"`

	// Relations only declare foreign keys for Atlas.
	Workspace *Workspace
	Folder    *Folder `gorm:"constraint:OnDelete:CASCADE"`
	ParentDoc *Doc    `gorm:"constraint:OnDelete:CASCADE"`
}

// DocLink is a [[wiki-link]] in a doc's content, rebuilt for the whole workspace on every write.
// TargetDocID nil = broken link (no doc matches TargetRef yet).
// The migration adds the unique (source_doc_id, lower(target_ref)) index by hand.
type DocLink struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	SourceDocID uuid.UUID  `gorm:"type:uuid;not null"`
	TargetRef   string     `gorm:"not null"`
	TargetDocID *uuid.UUID `gorm:"type:uuid;index"`
	CreatedAt   time.Time  `gorm:"not null;default:now()"`

	SourceDoc *Doc `gorm:"foreignKey:SourceDocID;constraint:OnDelete:CASCADE"`
	TargetDoc *Doc `gorm:"foreignKey:TargetDocID;constraint:OnDelete:SET NULL"`
}

// User is an account. The app stores Email trimmed and lowercased, so a plain unique index is enough.
// PasswordHash is nil for an account that only signs in with OAuth.
type User struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email           string    `gorm:"not null;uniqueIndex"`
	PasswordHash    *string
	EmailVerifiedAt *time.Time
	CreatedAt       time.Time `gorm:"not null;default:now()"`
	UpdatedAt       time.Time `gorm:"not null;default:now()"`
}

// WorkspaceMember gives a user a role in a workspace. The migration adds the CHECK on role by hand.
type WorkspaceMember struct {
	WorkspaceID uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID      uuid.UUID `gorm:"type:uuid;primaryKey;index"`
	Role        string    `gorm:"not null"`
	CreatedAt   time.Time `gorm:"not null;default:now()"`

	// Relations only declare foreign keys for Atlas.
	Workspace *Workspace `gorm:"constraint:OnDelete:CASCADE"`
	User      *User      `gorm:"constraint:OnDelete:CASCADE"`
}

// Session is a browser sign-in; only the SHA-256 of the cookie value is stored.
// It ends 14 days after LastUsedAt or at ExpiresAt, whichever comes first.
type Session struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID     uuid.UUID `gorm:"type:uuid;not null;index"`
	TokenHash  string    `gorm:"not null;uniqueIndex"`
	UserAgent  string    `gorm:"not null;default:''"`
	IP         string    `gorm:"not null;default:''"`
	CreatedAt  time.Time `gorm:"not null;default:now()"`
	LastUsedAt time.Time `gorm:"not null;default:now()"`
	ExpiresAt  time.Time `gorm:"not null"`

	User *User `gorm:"constraint:OnDelete:CASCADE"`
}

// PersonalAccessToken lets a tool outside the browser call the API; only the SHA-256 of the token is stored.
// The migration adds the CHECK on scope by hand.
type PersonalAccessToken struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID     uuid.UUID `gorm:"type:uuid;not null;index"`
	Name       string    `gorm:"not null"`
	TokenHash  string    `gorm:"not null;uniqueIndex"`
	Scope      string    `gorm:"not null"`
	LastUsedAt *time.Time
	RevokedAt  *time.Time
	CreatedAt  time.Time `gorm:"not null;default:now()"`

	User *User `gorm:"constraint:OnDelete:CASCADE"`
}
