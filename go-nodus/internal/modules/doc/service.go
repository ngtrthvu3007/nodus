package doc

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/link"
	"go-nodus/internal/modules/tree"
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
	request createDocRequest,
) (docResponse, error) {
	database := service.db.WithContext(ctx)

	var doc db.Doc
	err := database.Transaction(func(tx *gorm.DB) (err error) {
		doc, err = service.insertDoc(tx, workspaceID, request)
		return err
	})

	if err != nil {
		return docResponse{}, err
	}

	return docResponse{
		ID:       doc.ID,
		Title:    doc.Title,
		Content:  doc.Content,
		ParentID: tree.GetParentID(tree.GetDocParent(&doc)),
		Position: doc.Position,
	}, nil
}

func (service *Service) Get(ctx context.Context, id uuid.UUID) (docDetail, error) {
	database := service.db.WithContext(ctx)

	doc, err := httpx.FindByID[db.Doc](database, id, httpx.ErrDocNotFound)
	if err != nil {
		return docDetail{}, err
	}

	return service.buildDocDetail(database, doc)
}

func (service *Service) Update(ctx context.Context, id uuid.UUID, request updateDocRequest) (docDetail, error) {
	database := service.db.WithContext(ctx)

	var saved *db.Doc
	err := database.Transaction(func(tx *gorm.DB) (err error) {
		saved, err = service.saveDoc(tx, id, request)
		return err
	})

	if err != nil {
		return docDetail{}, err
	}

	return service.buildDocDetail(database, saved)
}

func (service *Service) Move(ctx context.Context, id uuid.UUID, request tree.MoveRequest) (tree.Moved, error) {
	database := service.db.WithContext(ctx)

	var moved tree.Moved
	err := database.Transaction(func(tx *gorm.DB) error {
		doc, err := service.lockDoc(tx, id)
		if err != nil {
			return err
		}

		item := tree.Item{
			ID:          doc.ID,
			WorkspaceID: doc.WorkspaceID,
			Kind:        tree.KindDoc,
			Name:        doc.Title,
		}
		moved, err = service.treeService.MoveItem(tx, item, request)
		if err != nil {
			return err
		}

		return link.RelinkWorkspace(tx, doc.WorkspaceID)
	})

	return moved, err
}

// Delete soft-deletes the doc and every doc under it.
func (service *Service) Delete(ctx context.Context, id uuid.UUID) error {
	database := service.db.WithContext(ctx)

	return database.Transaction(func(tx *gorm.DB) error {
		doc, err := service.lockDoc(tx, id)
		if err != nil {
			return err
		}

		index, err := service.treeService.LoadIndex(tx, doc.WorkspaceID)
		if err != nil {
			return err
		}

		docIDs := index.CollectSubtree(doc.ID)

		err = tx.Delete(&db.Doc{}, "id IN ?", docIDs).Error
		if err != nil {
			return err
		}

		return link.RelinkWorkspace(tx, doc.WorkspaceID)
	})
}

func (service *Service) buildDocDetail(tx *gorm.DB, doc *db.Doc) (docDetail, error) {
	index, err := service.treeService.LoadIndex(tx, doc.WorkspaceID)
	if err != nil {
		return docDetail{}, err
	}

	prev, next := findDocNeighbors(index, doc.ID)

	return docDetail{
		ID:       doc.ID,
		Title:    doc.Title,
		Content:  doc.Content,
		ParentID: tree.GetParentID(tree.GetDocParent(doc)),
		Prev:     prev,
		Next:     next,
	}, nil
}

func (service *Service) insertDoc(tx *gorm.DB, workspaceID uuid.UUID, request createDocRequest) (db.Doc, error) {
	title, err := tree.ValidateName(request.Title)
	if err != nil {
		return db.Doc{}, err
	}

	err = service.treeService.LockWorkspace(tx, workspaceID)
	if err != nil {
		return db.Doc{}, err
	}

	parent, position, err := service.treeService.PlaceNew(tx, workspaceID, tree.KindDoc, request.ParentID, title)
	if err != nil {
		return db.Doc{}, err
	}

	doc := db.Doc{
		WorkspaceID: workspaceID,
		Title:       title,
		Content:     request.Content,
		Position:    position,
	}
	doc.FolderID, doc.ParentDocID = tree.ToDocParentColumns(parent)

	err = tx.Create(&doc).Error
	if err != nil {
		return db.Doc{}, err
	}

	return doc, link.RelinkWorkspace(tx, workspaceID)
}

func (service *Service) saveDoc(tx *gorm.DB, id uuid.UUID, request updateDocRequest) (*db.Doc, error) {
	doc, err := service.lockDoc(tx, id)
	if err != nil {
		return nil, err
	}

	title, err := tree.ValidateName(request.Title)
	if err != nil {
		return nil, err
	}

	err = service.treeService.CheckNameFree(tx, doc.WorkspaceID, tree.GetDocParent(doc), title, doc.ID)
	if err != nil {
		return nil, err
	}

	changes := map[string]any{"title": title, "content": request.Content}

	err = tx.Model(&db.Doc{}).Where("id = ?", doc.ID).Updates(changes).Error
	if err != nil {
		return nil, err
	}

	err = link.RelinkWorkspace(tx, doc.WorkspaceID)
	if err != nil {
		return nil, err
	}

	return httpx.FindByID[db.Doc](tx, doc.ID, httpx.ErrDocNotFound)
}

// Reading order is depth-first with folders skipped.
func findDocNeighbors(index *tree.Index, id uuid.UUID) (prev, next *docRef) {
	var docs []tree.Node

	var walk func(parentID uuid.UUID)
	walk = func(parentID uuid.UUID) {
		for _, node := range index.Children(parentID) {
			if node.Kind == tree.KindDoc {
				docs = append(docs, node)
			}

			walk(node.ID)
		}
	}
	walk(uuid.Nil)

	for i, node := range docs {
		if node.ID != id {
			continue
		}

		if i > 0 {
			prev = &docRef{ID: docs[i-1].ID, Title: docs[i-1].Name}
		}

		if i+1 < len(docs) {
			next = &docRef{ID: docs[i+1].ID, Title: docs[i+1].Name}
		}
	}

	return prev, next
}

// Locks the workspace first, then re-reads the doc so it stays valid until commit.
func (service *Service) lockDoc(tx *gorm.DB, id uuid.UUID) (*db.Doc, error) {
	doc, err := httpx.FindByID[db.Doc](tx, id, httpx.ErrDocNotFound)
	if err != nil {
		return nil, err
	}

	err = service.treeService.LockWorkspace(tx, doc.WorkspaceID)
	if err != nil {
		return nil, err
	}

	return httpx.FindByID[db.Doc](tx, id, httpx.ErrDocNotFound)
}
