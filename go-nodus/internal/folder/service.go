package folder

import (
	"context"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"go-nodus/internal/libs"
	"go-nodus/internal/note"
)

var errFolderNotFound = fiber.NewError(fiber.StatusNotFound, "Folder is not found")

type service struct {
	repo     *Repository
	noteRepo *note.Repository
}

func NewService(repo *Repository, noteRepo *note.Repository) Service {
	return &service{repo: repo, noteRepo: noteRepo}
}

func (s *service) Create(ctx context.Context, name string) (*Folder, error) {
	return s.repo.Create(ctx, name)
}

func (s *service) Update(ctx context.Context, id uuid.UUID, name string) (*Folder, error) {
	updated, err := s.repo.Update(ctx, id, name)
	if libs.IsNotFound(err) {
		return nil, errFolderNotFound
	}

	return updated, err
}

func (s *service) Delete(ctx context.Context, id uuid.UUID) error {
	// DeleteFolder là :exec, không báo khi id không tồn tại — kiểm tra trước để trả 404.
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		if libs.IsNotFound(err) {
			return errFolderNotFound
		}
		return err
	}

	return s.repo.Delete(ctx, id)
}

func (s *service) FindAll(ctx context.Context) ([]Folder, error) {
	return s.repo.FindAll(ctx)
}

func (s *service) FindDetailByID(ctx context.Context, id uuid.UUID) (*FolderDetail, error) {
	found, err := s.repo.FindByID(ctx, id)
	if libs.IsNotFound(err) {
		return nil, errFolderNotFound
	}
	if err != nil {
		return nil, err
	}

	notes, err := s.noteRepo.FindByFolderID(ctx, id)
	if err != nil {
		return nil, err
	}

	return &FolderDetail{Folder: *found, Notes: notes}, nil
}
