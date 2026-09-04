package note

import (
	"context"

	"github.com/google/uuid"
)

// Service defines the business logic for the note domain. Handler depends
// on this interface, not the concrete implementation, so it can be tested
// or swapped independently of persistence details.
type Service interface {
	Create(ctx context.Context, req createNoteRequest) (*Note, error)
	Update(ctx context.Context, id uuid.UUID, req updateNoteContentRequest) (*Note, error)
	Move(ctx context.Context, req moveNoteRequest) (*Note, error)
	FindByID(ctx context.Context, id uuid.UUID) (*Note, error)
	FindAll(ctx context.Context, query string) ([]Note, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
