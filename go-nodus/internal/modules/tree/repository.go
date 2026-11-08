package tree

import (
	"bytes"
	"cmp"
	"context"
	"slices"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"go-nodus/internal/db"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(database *gorm.DB) *Repository {
	return &Repository{db: database}
}

func (repository *Repository) WorkspaceExists(ctx context.Context, workspaceID uuid.UUID) (bool, error) {
	database := repository.db.WithContext(ctx)

	var count int64
	err := database.Model(&db.Workspace{}).
		Where("id = ?", workspaceID).
		Count(&count).Error

	return count > 0, err
}

func (repository *Repository) ListNodes(ctx context.Context, workspaceID uuid.UUID) ([]Node, error) {
	database := repository.db.WithContext(ctx)

	return repository.LoadNodes(database, workspaceID)
}

func (repository *Repository) LoadNodes(tx *gorm.DB, workspaceID uuid.UUID) ([]Node, error) {
	var folders []db.Folder
	err := tx.Select("id", "parent_folder_id", "name", "position").
		Where("workspace_id = ?", workspaceID).Find(&folders).Error

	if err != nil {
		return nil, err
	}

	var docs []db.Doc
	err = tx.Select("id", "folder_id", "parent_doc_id", "title", "position").
		Where("workspace_id = ?", workspaceID).Find(&docs).Error

	if err != nil {
		return nil, err
	}

	nodes := make([]Node, 0, len(folders)+len(docs))
	for _, folder := range folders {
		nodes = append(nodes, Node{
			ID:       folder.ID,
			ParentID: folder.ParentFolderID,
			Kind:     KindFolder,
			Name:     folder.Name,
			Position: folder.Position,
		})
	}

	for _, doc := range docs {
		nodes = append(nodes, Node{
			ID:       doc.ID,
			ParentID: GetParentID(GetDocParent(&doc)),
			Kind:     KindDoc,
			Name:     doc.Title,
			Position: doc.Position,
		})
	}

	slices.SortFunc(nodes, func(left, right Node) int {
		byPosition := cmp.Compare(left.Position, right.Position)
		if byPosition != 0 {
			return byPosition
		}

		return bytes.Compare(left.ID[:], right.ID[:])
	})

	return nodes, nil
}

// Returns gorm.ErrRecordNotFound when the workspace does not exist.
func (repository *Repository) LockWorkspace(tx *gorm.DB, id uuid.UUID) error {
	var workspace db.Workspace
	forUpdate := clause.Locking{Strength: clause.LockingStrengthUpdate}

	return tx.Clauses(forUpdate).
		Select("id").Where("id = ?", id).First(&workspace).Error
}

func (repository *Repository) UpdateParent(tx *gorm.DB, item Item, parent *Node, position int64) error {
	if item.Kind == KindFolder {
		folder := db.Folder{
			ParentFolderID: GetParentID(parent),
			Position:       position,
		}

		return tx.Model(&db.Folder{}).Where("id = ?", item.ID).
			Select("ParentFolderID", "Position").Updates(folder).Error
	}

	folderID, parentDocID := ToDocParentColumns(parent)
	doc := db.Doc{
		FolderID:    folderID,
		ParentDocID: parentDocID,
		Position:    position,
	}

	return tx.Model(&db.Doc{}).Where("id = ?", item.ID).
		Select("FolderID", "ParentDocID", "Position").Updates(doc).Error
}

func (repository *Repository) UpdatePosition(tx *gorm.DB, node Node, position int64) error {
	var model any = &db.Doc{}
	if node.Kind == KindFolder {
		model = &db.Folder{}
	}

	return tx.Model(model).Where("id = ?", node.ID).
		Update("position", position).Error
}
