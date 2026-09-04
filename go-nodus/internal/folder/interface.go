package folder

import (
	"context"

	"github.com/google/uuid"
)

// Service defines the business logic for the folder domain. Handler depends
// on this interface, not the concrete implementation, so it can be tested
// or swapped independently of persistence details.
type Service interface {
	Create(ctx context.Context, name string) (*Folder, error)
	Update(ctx context.Context, id uuid.UUID, name string) (*Folder, error)
	Delete(ctx context.Context, id uuid.UUID) error
	FindAll(ctx context.Context) ([]Folder, error)
	FindDetailByID(ctx context.Context, id uuid.UUID) (*FolderDetail, error)
}
