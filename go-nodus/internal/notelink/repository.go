package notelink

import (
	"context"
	"errors"

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

func toPgUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

// ResolveTitlesToNoteIDs looks up each title and returns the IDs of the
// notes that exist. Titles with no matching note are silently skipped.
func (r *Repository) ResolveTitlesToNoteIDs(ctx context.Context, titles []string) ([]uuid.UUID, error) {
	ids := make([]uuid.UUID, 0, len(titles))
	for _, title := range titles {
		row, err := r.queries.FindNoteIDByTitle(ctx, title)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			return nil, err
		}
		ids = append(ids, uuid.UUID(row.Bytes))
	}
	return ids, nil
}

// RebuildLinks replaces sourceNoteID's outgoing links with targetNoteIDs.
func (r *Repository) RebuildLinks(ctx context.Context, sourceNoteID uuid.UUID, targetNoteIDs []uuid.UUID) error {
	if err := r.queries.DeleteNoteLinksBySourceID(ctx, toPgUUID(sourceNoteID)); err != nil {
		return err
	}

	for _, targetNoteID := range targetNoteIDs {
		if _, err := r.queries.CreateNoteLink(ctx, db.CreateNoteLinkParams{
			SourceNoteID: toPgUUID(sourceNoteID),
			TargetNoteID: toPgUUID(targetNoteID),
		}); err != nil {
			return err
		}
	}

	return nil
}

func toLinkedNote(id pgtype.UUID, title string, createdAt pgtype.Timestamptz) LinkedNote {
	return LinkedNote{
		ID:        uuid.UUID(id.Bytes),
		Title:     title,
		CreatedAt: createdAt.Time,
	}
}

func (r *Repository) FindBacklinks(ctx context.Context, noteID uuid.UUID) ([]LinkedNote, error) {
	rows, err := r.queries.FindBacklinksByNoteID(ctx, toPgUUID(noteID))
	if err != nil {
		return nil, err
	}

	notes := make([]LinkedNote, len(rows))
	for i, row := range rows {
		notes[i] = toLinkedNote(row.ID, row.Title, row.CreatedAt)
	}
	return notes, nil
}

func (r *Repository) FindOutgoingLinks(ctx context.Context, noteID uuid.UUID) ([]LinkedNote, error) {
	rows, err := r.queries.FindOutgoingLinksByNoteID(ctx, toPgUUID(noteID))
	if err != nil {
		return nil, err
	}

	notes := make([]LinkedNote, len(rows))
	for i, row := range rows {
		notes[i] = toLinkedNote(row.ID, row.Title, row.CreatedAt)
	}
	return notes, nil
}

func (r *Repository) FindTitleSuggestions(ctx context.Context, query string) ([]NoteTitleSuggestion, error) {
	rows, err := r.queries.FindNoteTitlesByPrefix(ctx, query)
	if err != nil {
		return nil, err
	}

	suggestions := make([]NoteTitleSuggestion, len(rows))
	for i, row := range rows {
		suggestions[i] = NoteTitleSuggestion{ID: uuid.UUID(row.ID.Bytes), Title: row.Title}
	}
	return suggestions, nil
}
