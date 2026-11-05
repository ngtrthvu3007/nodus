package note

import (
	"context"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"go-nodus/internal/libs"
	"go-nodus/internal/notelink"
)

type service struct {
	repo            *Repository
	noteLinkService *notelink.Service
}

func NewService(repo *Repository, noteLinkService *notelink.Service) Service {
	return &service{repo: repo, noteLinkService: noteLinkService}
}

func (s *service) Create(ctx context.Context, req createNoteRequest) (*Note, error) {
	folderID := req.FolderID

	if req.ParentNoteID != nil {
		if err := s.checkRootParent(ctx, *req.ParentNoteID); err != nil {
			return nil, err
		}

		// Note con không lưu folder riêng — luôn kế thừa folder của note cha lúc đọc.
		folderID = nil
	} else if err := s.checkFolderExists(ctx, folderID); err != nil {
		return nil, err
	}

	return s.repo.Create(ctx, CreateNoteParams{
		Title:        req.Title,
		Content:      req.Content,
		FolderID:     folderID,
		ParentNoteID: req.ParentNoteID,
	})
}

func (s *service) Update(ctx context.Context, id uuid.UUID, req updateNoteContentRequest) (*Note, error) {
	if _, err := s.findNote(ctx, id); err != nil {
		return nil, err
	}

	updated, err := s.repo.Update(ctx, UpdateNoteParams{
		ID:      id,
		Title:   req.Title,
		Content: req.Content,
	})
	if err != nil {
		return nil, err
	}

	if err := s.noteLinkService.RebuildLinksFromContent(ctx, id, req.Content); err != nil {
		return nil, err
	}

	return updated, nil
}

func (s *service) Move(ctx context.Context, req moveNoteRequest) (*Note, error) {
	note, err := s.findNote(ctx, req.ID)
	if err != nil {
		return nil, err
	}

	folderID := req.FolderID

	// Cả 2 field cùng null = chuyển về root, không folder.
	// Cả 2 cùng khác null (trái hợp đồng UI): ưu tiên parentNoteId, bỏ qua folderId — nhất quán với Create.
	if req.ParentNoteID != nil {
		if *req.ParentNoteID == req.ID {
			return nil, fiber.NewError(fiber.StatusBadRequest, "Note cannot be its own parent")
		}

		// Chỉ note gốc mới có con — đang có con mà thành note con sẽ tạo 3 level.
		if note.HasChildren {
			return nil, fiber.NewError(fiber.StatusBadRequest, "Root note with children cannot be re-parented")
		}

		if err := s.checkRootParent(ctx, *req.ParentNoteID); err != nil {
			return nil, err
		}

		folderID = nil
	} else if err := s.checkFolderExists(ctx, folderID); err != nil {
		return nil, err
	}

	return s.repo.Move(ctx, MoveNoteParams{
		ID:           req.ID,
		FolderID:     folderID,
		ParentNoteID: req.ParentNoteID,
	})
}

func (s *service) FindByID(ctx context.Context, id uuid.UUID) (*Note, error) {
	return s.findNote(ctx, id)
}

func (s *service) FindAll(ctx context.Context, query string) ([]Note, error) {
	return s.repo.FindAll(ctx, query)
}

func (s *service) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.repo.Delete(ctx, id)
	if libs.IsNotFound(err) {
		return fiber.NewError(fiber.StatusNotFound, "Note is not found")
	}

	return err
}

func (s *service) findNote(ctx context.Context, id uuid.UUID) (*Note, error) {
	found, err := s.repo.FindByID(ctx, id)
	if libs.IsNotFound(err) {
		return nil, fiber.NewError(fiber.StatusNotFound, "Note is not found")
	}

	return found, err
}

// checkRootParent ensures parentID points to an existing root note, so nesting never exceeds 2 levels.
func (s *service) checkRootParent(ctx context.Context, parentID uuid.UUID) error {
	parent, err := s.repo.FindByID(ctx, parentID)
	if libs.IsNotFound(err) {
		return fiber.NewError(fiber.StatusBadRequest, "Parent note does not exist")
	}
	if err != nil {
		return err
	}

	if parent.ParentNoteID != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Parent note must be a root note")
	}

	return nil
}

func (s *service) checkFolderExists(ctx context.Context, folderID *uuid.UUID) error {
	if folderID == nil {
		return nil
	}

	_, err := s.repo.queries.FindFolderByID(ctx, toPgUUID(*folderID))
	if libs.IsNotFound(err) {
		return fiber.NewError(fiber.StatusBadRequest, "Folder does not exist")
	}

	return err
}
