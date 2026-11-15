package export

import (
	"archive/zip"
	"context"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/tree"
)

var errFolderNotFound = httpx.NewError(http.StatusNotFound, "folder_not_found", "Folder is not found")

type Service struct {
	db          *gorm.DB
	treeService *tree.Service
}

func NewService(database *gorm.DB, treeService *tree.Service) *Service {
	return &Service{db: database, treeService: treeService}
}

// ExportDoc is the doc alone: its children are not included.
func (service *Service) ExportDoc(ctx context.Context, id uuid.UUID) (exportFile, error) {
	doc, err := httpx.FindByID[db.Doc](service.db.WithContext(ctx), id, httpx.ErrDocNotFound)
	if err != nil {
		return exportFile{}, err
	}

	return exportFile{
		Name:        toFileName(doc.Title) + ".md",
		ContentType: "text/markdown; charset=utf-8",
		Write: func(writer io.Writer) error {
			_, err := io.WriteString(writer, doc.Content)
			return err
		},
	}, nil
}

// ExportDocs is a flat zip of the chosen docs, without their children. Every id must be a live doc of the workspace,
// otherwise nothing is sent.
func (service *Service) ExportDocs(
	ctx context.Context,
	workspaceID uuid.UUID,
	request exportDocsRequest,
) (exportFile, error) {
	database := service.db.WithContext(ctx)

	_, err := httpx.FindByID[db.Workspace](database, workspaceID, httpx.ErrWorkspaceNotFound)
	if err != nil {
		return exportFile{}, err
	}

	ids := removeDuplicates(request.IDs)

	var docs []db.Doc
	err = database.Select("id", "title").Where("workspace_id = ? AND id IN ?", workspaceID, ids).Find(&docs).Error

	if err != nil {
		return exportFile{}, err
	}

	if len(docs) != len(ids) {
		return exportFile{}, httpx.ErrDocNotFound
	}

	titles := map[uuid.UUID]string{}
	for _, doc := range docs {
		titles[doc.ID] = doc.Title
	}

	usedNames := map[string]bool{}
	entries := make([]entry, 0, len(ids))
	for _, id := range ids {
		entries = append(entries, entry{path: takeName(usedNames, toFileName(titles[id]), ".md"), docID: id})
	}

	return service.buildZip(ctx, "docs.zip", entries), nil
}

// ExportFolder is the folder's branch as a zip that keeps the tree; the zip holds what is inside the folder.
func (service *Service) ExportFolder(ctx context.Context, id uuid.UUID) (exportFile, error) {
	database := service.db.WithContext(ctx)

	folder, err := httpx.FindByID[db.Folder](database, id, errFolderNotFound)
	if err != nil {
		return exportFile{}, err
	}

	index, err := service.treeService.LoadIndex(database, folder.WorkspaceID)
	if err != nil {
		return exportFile{}, err
	}

	entries := buildTreeEntries(index, folder.ID, "")

	return service.buildZip(ctx, toFileName(folder.Name)+".zip", entries), nil
}

// buildZip reads each doc's content only when it is written, so a big folder is never held in memory at once.
func (service *Service) buildZip(ctx context.Context, name string, entries []entry) exportFile {
	return exportFile{
		Name:        name,
		ContentType: "application/zip",
		Write: func(writer io.Writer) error {
			archive := zip.NewWriter(writer)

			for _, item := range entries {
				err := service.writeEntry(ctx, archive, item)
				if err != nil {
					return err
				}
			}

			return archive.Close()
		},
	}
}

func (service *Service) writeEntry(ctx context.Context, archive *zip.Writer, item entry) error {
	if strings.HasSuffix(item.path, "/") {
		_, err := archive.Create(item.path)
		return err
	}

	var doc db.Doc
	err := service.db.WithContext(ctx).Select("content").Where("id = ?", item.docID).First(&doc).Error

	if err != nil {
		return err
	}

	file, err := archive.Create(item.path)
	if err != nil {
		return err
	}

	_, err = io.WriteString(file, doc.Content)

	return err
}

func removeDuplicates(ids []uuid.UUID) []uuid.UUID {
	seen := map[uuid.UUID]bool{}
	unique := make([]uuid.UUID, 0, len(ids))

	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			unique = append(unique, id)
		}
	}

	return unique
}
