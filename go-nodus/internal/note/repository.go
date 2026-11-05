package note

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"go-nodus/internal/db"
)

type Repository struct {
	queries *db.Queries
}

func NewRepository(queries *db.Queries) *Repository {
	return &Repository{queries: queries}
}

func toNote(row db.Note) Note {
	return Note{
		ID:           uuid.UUID(row.ID.Bytes),
		Title:        row.Title,
		Content:      row.Content,
		FolderID:     toUUIDPtr(row.FolderID),
		ParentNoteID: toUUIDPtr(row.ParentNoteID),
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}
}

func toPgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func toUUIDPtr(id pgtype.UUID) *uuid.UUID {
	if !id.Valid {
		return nil
	}

	value := uuid.UUID(id.Bytes)
	return &value
}

func toPgUUIDPtr(id *uuid.UUID) pgtype.UUID {
	if id == nil {
		return pgtype.UUID{}
	}

	return toPgUUID(*id)
}

// parentIDsWithChildren returns the set of note IDs that currently have at
// least one child, so callers can populate Note.HasChildren for a batch of
// notes with a single extra query instead of one query per note (N+1).
func (r *Repository) parentIDsWithChildren(ctx context.Context) (map[uuid.UUID]bool, error) {
	rows, err := r.queries.FindParentNoteIDsWithChildren(ctx)
	if err != nil {
		return nil, err
	}

	set := make(map[uuid.UUID]bool, len(rows))
	for _, row := range rows {
		if id := toUUIDPtr(row); id != nil {
			set[*id] = true
		}
	}
	return set, nil
}

func (r *Repository) FindAll(ctx context.Context, query string) ([]Note, error) {
	rows, err := r.queries.FindNotes(ctx, query)
	if err != nil {
		return nil, err
	}

	parentIDs, err := r.parentIDsWithChildren(ctx)
	if err != nil {
		return nil, err
	}

	notes := make([]Note, len(rows))
	for i, row := range rows {
		note := toNote(row)
		note.HasChildren = parentIDs[note.ID]
		notes[i] = note
	}
	return notes, nil
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Note, error) {
	row, err := r.queries.FindNoteByID(ctx, toPgUUID(id))
	if err != nil {
		return nil, err
	}

	found := toNote(row)

	hasChildren, err := r.queries.NoteHasChildren(ctx, toPgUUID(id))
	if err != nil {
		return nil, err
	}
	found.HasChildren = hasChildren

	return &found, nil
}

func (r *Repository) Create(ctx context.Context, params CreateNoteParams) (*Note, error) {
	row, err := r.queries.CreateNote(ctx, db.CreateNoteParams{
		Title:        params.Title,
		Content:      params.Content,
		FolderID:     toPgUUIDPtr(params.FolderID),
		ParentNoteID: toPgUUIDPtr(params.ParentNoteID),
	})
	if err != nil {
		return nil, err
	}

	created := toNote(row)
	return &created, nil
}

func (r *Repository) FindByFolderID(ctx context.Context, folderID uuid.UUID) ([]Note, error) {
	rows, err := r.queries.FindNotesByFolderID(ctx, toPgUUID(folderID))
	if err != nil {
		return nil, err
	}

	parentIDs, err := r.parentIDsWithChildren(ctx)
	if err != nil {
		return nil, err
	}

	notes := make([]Note, len(rows))
	for i, row := range rows {
		note := toNote(row)
		note.HasChildren = parentIDs[note.ID]
		notes[i] = note
	}
	return notes, nil
}

func (r *Repository) Update(ctx context.Context, params UpdateNoteParams) (*Note, error) {
	row, err := r.queries.UpdateNote(ctx, db.UpdateNoteParams{
		ID:      toPgUUID(params.ID),
		Title:   params.Title,
		Content: params.Content,
	})

	if err != nil {
		return nil, err
	}

	updated := toNote(row)

	hasChildren, err := r.queries.NoteHasChildren(ctx, toPgUUID(params.ID))
	if err != nil {
		return nil, err
	}
	updated.HasChildren = hasChildren

	return &updated, nil
}

func (r *Repository) HasChildren(ctx context.Context, id uuid.UUID) (bool, error) {
	return r.queries.NoteHasChildren(ctx, toPgUUID(id))
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	rows, err := r.queries.DeleteNote(ctx, toPgUUID(id))
	if err != nil {
		return err
	}

	// Không dòng nào bị xóa = note không tồn tại hoặc đã xóa — báo như mọi query :one khác.
	if rows == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

func (r *Repository) Move(ctx context.Context, params MoveNoteParams) (*Note, error) {
	row, err := r.queries.MoveNote(ctx, db.MoveNoteParams{
		ID:           toPgUUID(params.ID),
		FolderID:     toPgUUIDPtr(params.FolderID),
		ParentNoteID: toPgUUIDPtr(params.ParentNoteID),
	})

	if err != nil {
		return nil, err
	}

	moved := toNote(row)

	hasChildren, err := r.queries.NoteHasChildren(ctx, toPgUUID(params.ID))
	if err != nil {
		return nil, err
	}
	moved.HasChildren = hasChildren

	return &moved, nil
}
