package tree

import (
	"context"
	"errors"
	"slices"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/httpx"
)

type Service struct {
	repository *Repository
}

func NewService(repository *Repository) *Service {
	return &Service{repository: repository}
}

func (service *Service) GetTree(ctx context.Context, workspaceID uuid.UUID) ([]Node, error) {
	exists, err := service.repository.WorkspaceExists(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	if !exists {
		return nil, httpx.ErrWorkspaceNotFound
	}

	return service.repository.ListNodes(ctx, workspaceID)
}

func (service *Service) LoadIndex(tx *gorm.DB, workspaceID uuid.UUID) (*Index, error) {
	nodes, err := service.repository.LoadNodes(tx, workspaceID)
	if err != nil {
		return nil, err
	}

	return newIndex(nodes), nil
}

func (service *Service) LockWorkspace(tx *gorm.DB, id uuid.UUID) error {
	err := service.repository.LockWorkspace(tx, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return httpx.ErrWorkspaceNotFound
	}

	return err
}

func (service *Service) PlaceNew(
	tx *gorm.DB,
	workspaceID uuid.UUID,
	kind string,
	parentID *uuid.UUID,
	name string,
) (*Node, int64, error) {
	index, err := service.LoadIndex(tx, workspaceID)
	if err != nil {
		return nil, 0, err
	}

	parent, err := resolveParent(index, parentID)
	if err != nil {
		return nil, 0, err
	}

	newItem := Item{Kind: kind, Name: name}

	siblings, err := checkPlacement(index, newItem, parent, 1)
	if err != nil {
		return nil, 0, err
	}

	if len(siblings) == 0 {
		return parent, positionStep, nil
	}

	lastSibling := siblings[len(siblings)-1]

	return parent, lastSibling.Position + positionStep, nil
}

func (service *Service) CheckNameFree(
	tx *gorm.DB,
	workspaceID uuid.UUID,
	parent *Node,
	name string,
	selfID uuid.UUID,
) error {
	index, err := service.LoadIndex(tx, workspaceID)
	if err != nil {
		return err
	}

	siblings := excludeNode(index.findSiblings(parent), selfID)
	nameTaken := isNameTaken(siblings, name)

	if nameTaken {
		return errNameConflict
	}

	return nil
}

// Call with the workspace lock held.
func (service *Service) MoveItem(tx *gorm.DB, item Item, request MoveRequest) (Moved, error) {
	index, err := service.LoadIndex(tx, item.WorkspaceID)
	if err != nil {
		return Moved{}, err
	}

	parent, err := resolveParent(index, request.ParentID)
	if err != nil {
		return Moved{}, err
	}

	subtree := index.CollectSubtree(item.ID)
	if parent != nil && slices.Contains(subtree, parent.ID) {
		return Moved{}, errCycle
	}

	siblings, err := checkPlacement(index, item, parent, index.countHeight(item.ID))
	if err != nil {
		return Moved{}, err
	}

	position, err := service.getPositionAfter(tx, siblings, request.AfterID)
	if err != nil {
		return Moved{}, err
	}

	err = service.repository.UpdateParent(tx, item, parent, position)
	if err != nil {
		return Moved{}, err
	}

	return Moved{
		ID:       item.ID,
		ParentID: GetParentID(parent),
		Position: position,
	}, nil
}

// Renumbers the siblings when no gap is left between two positions.
func (service *Service) getPositionAfter(tx *gorm.DB, siblings []Node, afterID *uuid.UUID) (int64, error) {
	afterIndex := -1
	if afterID != nil {
		afterIndex = slices.IndexFunc(siblings, func(sibling Node) bool {
			return sibling.ID == *afterID
		})

		if afterIndex < 0 {
			return 0, errInvalidAfter
		}
	}

	position, hasGap := getPositionBetween(siblings, afterIndex)
	if hasGap {
		return position, nil
	}

	for i := range siblings {
		siblings[i].Position = int64(i+1) * positionStep

		err := service.repository.UpdatePosition(tx, siblings[i], siblings[i].Position)
		if err != nil {
			return 0, err
		}
	}

	position, _ = getPositionBetween(siblings, afterIndex)

	return position, nil
}
