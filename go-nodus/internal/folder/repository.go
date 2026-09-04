package folder

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"go-nodus/internal/db"
)

type Repository struct {
	queries *db.Queries
}

func NewRepository(queries *db.Queries) *Repository {
	return &Repository{queries: queries}
}

func toPgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func toFolder(row db.Folder) Folder {
	return Folder{
		ID:        uuid.UUID(row.ID.Bytes),
		Name:      row.Name,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}

// noteCountsByFolder returns note counts keyed by folder ID, so FindAll can
// populate Folder.NoteCount for a batch of folders with a single extra query
// instead of one query per folder (N+1) — same pattern as Note.HasChildren.
func (r *Repository) noteCountsByFolder(ctx context.Context) (map[uuid.UUID]int, error) {
	rows, err := r.queries.CountNotesByFolder(ctx)
	if err != nil {
		return nil, err
	}

	counts := make(map[uuid.UUID]int, len(rows))
	for _, row := range rows {
		if row.FolderID.Valid {
			counts[uuid.UUID(row.FolderID.Bytes)] = int(row.NoteCount)
		}
	}
	return counts, nil
}

func (r *Repository) FindAll(ctx context.Context) ([]Folder, error) {
	rows, err := r.queries.FindFolders(ctx)
	if err != nil {
		return nil, err
	}

	noteCounts, err := r.noteCountsByFolder(ctx)
	if err != nil {
		return nil, err
	}

	folders := make([]Folder, len(rows))
	for i, row := range rows {
		found := toFolder(row)
		found.NoteCount = noteCounts[found.ID]
		folders[i] = found
	}
	return folders, nil
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Folder, error) {
	row, err := r.queries.FindFolderByID(ctx, toPgUUID(id))
	if err != nil {
		return nil, err
	}

	found := toFolder(row)
	return &found, nil
}

func (r *Repository) Create(ctx context.Context, name string) (*Folder, error) {
	row, err := r.queries.CreateFolder(ctx, name)
	if err != nil {
		return nil, err
	}

	created := toFolder(row)
	return &created, nil
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, name string) (*Folder, error) {
	row, err := r.queries.UpdateFolder(ctx, db.UpdateFolderParams{
		ID:   toPgUUID(id),
		Name: name,
	})

	if err != nil {
		return nil, err
	}
	updated := toFolder(row)
	return &updated, nil
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteFolder(ctx, toPgUUID(id))
}
