package notelink

import (
	"context"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// RebuildLinksFromContent parses [[Title]] wiki-links out of content,
// resolves them to existing notes, and replaces sourceNoteID's outgoing
// links with the result.
func (s *Service) RebuildLinksFromContent(ctx context.Context, sourceNoteID uuid.UUID, content string) error {
	titles := ParseLinkedTitles(content)

	targetNoteIDs, err := s.repo.ResolveTitlesToNoteIDs(ctx, titles)
	if err != nil {
		return err
	}

	return s.repo.RebuildLinks(ctx, sourceNoteID, targetNoteIDs)
}

func (s *Service) FindLinks(ctx context.Context, noteID uuid.UUID) (*NoteLinks, error) {
	backlinks, err := s.repo.FindBacklinks(ctx, noteID)
	if err != nil {
		return nil, err
	}

	outgoing, err := s.repo.FindOutgoingLinks(ctx, noteID)
	if err != nil {
		return nil, err
	}

	return &NoteLinks{Backlinks: backlinks, Outgoing: outgoing}, nil
}

func (s *Service) FindTitleSuggestions(ctx context.Context, query string) ([]NoteTitleSuggestion, error) {
	return s.repo.FindTitleSuggestions(ctx, query)
}
