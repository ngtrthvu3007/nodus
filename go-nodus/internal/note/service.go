package note

import (
	"context"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

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
		parent, err := s.repo.FindByID(ctx, *req.ParentNoteID)
		if err != nil || parent == nil {
			return nil, fiber.NewError(fiber.StatusBadRequest, "Parent note does not exist")
		}
		if parent.ParentNoteID != nil {
			return nil, fiber.NewError(fiber.StatusBadRequest, "Parent note must be a root note")
		}

		folderID = parent.FolderID
	} else if req.FolderID != nil {
		if err := s.checkFolderExists(ctx, req.FolderID); err != nil {
			return nil, err
		}
	}

	return s.repo.Create(ctx, CreateNoteParams{
		Title:        req.Title,
		Content:      req.Content,
		FolderID:     folderID,
		ParentNoteID: req.ParentNoteID,
	})
}

func (s *service) Update(ctx context.Context, id uuid.UUID, req updateNoteContentRequest) (*Note, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil || existing == nil {
		return nil, fiber.NewError(fiber.StatusNotFound, "Note is not found")
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
	note, err := s.repo.FindByID(ctx, req.ID)
	if err != nil || note == nil {
		return nil, fiber.NewError(fiber.StatusNotFound, "Note is not found")
	}

	isChild := note.ParentNoteID != nil
	folderID := req.FolderID
	parentNoteID := req.ParentNoteID

	// Trái hợp đồng UI (cả 2 field cùng khác null): ưu tiên parentNoteId, bỏ qua folderId — nhất quán với Create.
	if folderID != nil && parentNoteID != nil {
		folderID = nil
	}

	// Check tồn tại trước — target là note cha mới hay folder mới, đều phải có thật.
	parent, err := s.resolveMoveParent(ctx, req.ID, parentNoteID)
	if err != nil {
		return nil, err
	}

	if err := s.checkFolderExists(ctx, folderID); err != nil {
		return nil, err
	}

	// Áp rule move dựa trên loại note đang move + target đã xác nhận tồn tại.
	switch {
	case !isChild && parentNoteID != nil:
		// Note gốc chỉ được re-parent nếu chưa có con — tránh tạo 3-level.
		if note.HasChildren {
			return nil, fiber.NewError(fiber.StatusBadRequest, "Root note with children cannot be re-parented")
		}

	case isChild && parentNoteID != nil:
		// Note con re-parent sang note cha khác: cha mới phải là note gốc thật (giữ 2 level).
		if parent.ParentNoteID != nil {
			return nil, fiber.NewError(fiber.StatusBadRequest, "Parent note must be a root note")
		}
	}

	return s.repo.Move(ctx, MoveNoteParams{
		ID:           req.ID,
		FolderID:     folderID,
		ParentNoteID: parentNoteID,
	})
}

func (s *service) FindByID(ctx context.Context, id uuid.UUID) (*Note, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *service) FindAll(ctx context.Context, query string) ([]Note, error) {
	return s.repo.FindAll(ctx, query)
}

func (s *service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// resolveMoveParent returns the root note pointed to by parentNoteID, or nil if parentNoteID is nil.
func (s *service) resolveMoveParent(ctx context.Context, movingNoteID uuid.UUID, parentNoteID *uuid.UUID) (*Note, error) {
	if parentNoteID == nil {
		return nil, nil
	}

	if *parentNoteID == movingNoteID {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Note cannot be its own parent")
	}

	parent, err := s.repo.FindByID(ctx, *parentNoteID)
	if err != nil || parent == nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Parent note does not exist")
	}

	return parent, nil
}

func (s *service) checkFolderExists(ctx context.Context, folderID *uuid.UUID) error {
	if folderID == nil {
		return nil
	}

	if _, err := s.repo.queries.FindFolderByID(ctx, toPgUUID(*folderID)); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Folder does not exist")
	}

	return nil
}
