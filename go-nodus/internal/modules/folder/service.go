package folder

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/tree"
)

var (
	errFolderNotFound  = httpx.NewError(http.StatusNotFound, "folder_not_found", "Folder is not found")
	errNothingToUpdate = httpx.NewError(http.StatusBadRequest, "invalid_params", "Send name or description")
)

type Service struct {
	treeService *tree.Service
	db          *gorm.DB
}

func NewService(database *gorm.DB, treeService *tree.Service) *Service {
	return &Service{db: database, treeService: treeService}
}

func (service *Service) Create(
	ctx context.Context,
	workspaceID uuid.UUID,
	request createFolderRequest,
) (folderResponse, error) {
	database := service.db.WithContext(ctx)

	var folder db.Folder
	err := database.Transaction(func(tx *gorm.DB) (err error) {
		folder, err = service.insertFolder(tx, workspaceID, request)
		return err
	})

	if err != nil {
		return folderResponse{}, err
	}

	return toFolderResponse(&folder), nil
}

func (service *Service) Get(ctx context.Context, id uuid.UUID) (folderDetail, error) {
	database := service.db.WithContext(ctx)

	folder, err := httpx.FindByID[db.Folder](database, id, errFolderNotFound)
	if err != nil {
		return folderDetail{}, err
	}

	index, err := service.treeService.LoadIndex(database, folder.WorkspaceID)
	if err != nil {
		return folderDetail{}, err
	}

	children := []childNode{}
	for _, node := range index.Children(folder.ID) {
		children = append(children, childNode{
			ID:   node.ID,
			Kind: node.Kind,
			Name: node.Name,
		})
	}

	return folderDetail{
		ID:          folder.ID,
		Name:        folder.Name,
		Description: folder.Description,
		ParentID:    folder.ParentFolderID,
		Children:    children,
	}, nil
}

func (service *Service) Update(ctx context.Context, id uuid.UUID, request updateFolderRequest) (folderResponse, error) {
	database := service.db.WithContext(ctx)

	var updated *db.Folder
	err := database.Transaction(func(tx *gorm.DB) (err error) {
		updated, err = service.applyFolderUpdate(tx, id, request)
		return err
	})

	if err != nil {
		return folderResponse{}, err
	}

	return toFolderResponse(updated), nil
}

func (service *Service) Move(ctx context.Context, id uuid.UUID, request tree.MoveRequest) (tree.Moved, error) {
	database := service.db.WithContext(ctx)

	var moved tree.Moved
	err := database.Transaction(func(tx *gorm.DB) error {
		folder, err := service.lockFolder(tx, id)
		if err != nil {
			return err
		}

		item := tree.Item{
			ID:          folder.ID,
			WorkspaceID: folder.WorkspaceID,
			Kind:        tree.KindFolder,
			Name:        folder.Name,
		}
		moved, err = service.treeService.MoveItem(tx, item, request)

		return err
	})

	return moved, err
}

// Delete is a hard delete; the foreign keys cascade to everything inside.
func (service *Service) Delete(ctx context.Context, id uuid.UUID) error {
	database := service.db.WithContext(ctx)

	return database.Transaction(func(tx *gorm.DB) error {
		folder, err := service.lockFolder(tx, id)
		if err != nil {
			return err
		}

		return tx.Delete(&db.Folder{}, "id = ?", folder.ID).Error
	})
}

func (service *Service) insertFolder(
	tx *gorm.DB,
	workspaceID uuid.UUID,
	request createFolderRequest,
) (db.Folder, error) {
	name, err := tree.ValidateName(request.Name)
	if err != nil {
		return db.Folder{}, err
	}

	err = service.treeService.LockWorkspace(tx, workspaceID)
	if err != nil {
		return db.Folder{}, err
	}

	parent, position, err := service.treeService.PlaceNew(tx, workspaceID, tree.KindFolder, request.ParentID, name)
	if err != nil {
		return db.Folder{}, err
	}

	folder := db.Folder{
		WorkspaceID:    workspaceID,
		ParentFolderID: tree.GetParentID(parent),
		Name:           name,
		Description:    request.Description,
		Position:       position,
	}

	return folder, tx.Create(&folder).Error
}

func (service *Service) applyFolderUpdate(tx *gorm.DB, id uuid.UUID, request updateFolderRequest) (*db.Folder, error) {
	folder, err := service.lockFolder(tx, id)
	if err != nil {
		return nil, err
	}

	if request.Name == nil && request.Description == nil {
		return nil, errNothingToUpdate
	}

	changes := map[string]any{}

	if request.Name != nil {
		name, err := tree.ValidateName(*request.Name)
		if err != nil {
			return nil, err
		}

		err = service.treeService.CheckNameFree(tx, folder.WorkspaceID, tree.GetFolderParent(folder), name, folder.ID)
		if err != nil {
			return nil, err
		}

		changes["name"] = name
	}

	if request.Description != nil {
		changes["description"] = *request.Description
	}

	err = tx.Model(&db.Folder{}).
		Where("id = ?", folder.ID).
		Updates(changes).Error
	if err != nil {
		return nil, err
	}

	return httpx.FindByID[db.Folder](tx, folder.ID, errFolderNotFound)
}

func toFolderResponse(folder *db.Folder) folderResponse {
	return folderResponse{
		ID:          folder.ID,
		Name:        folder.Name,
		Description: folder.Description,
		ParentID:    folder.ParentFolderID,
		Position:    folder.Position,
	}
}

// Locks the workspace first, then re-reads the folder so it stays valid until commit.
func (service *Service) lockFolder(tx *gorm.DB, id uuid.UUID) (*db.Folder, error) {
	folder, err := httpx.FindByID[db.Folder](tx, id, errFolderNotFound)
	if err != nil {
		return nil, err
	}

	err = service.treeService.LockWorkspace(tx, folder.WorkspaceID)
	if err != nil {
		return nil, err
	}

	return httpx.FindByID[db.Folder](tx, id, errFolderNotFound)
}
