package doc

import (
	"bytes"
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"path"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/link"
	"go-nodus/internal/modules/tree"
)

const (
	maxImportFiles    = 20
	maxImportFileSize = 1 << 20
	// The files plus 1 MB for the multipart framing and the other fields.
	maxImportRequestBytes = maxImportFiles*maxImportFileSize + 1<<20

	markdownExtension = ".md"
)

var errInvalidImportParent = httpx.NewError(
	http.StatusBadRequest,
	"invalid_params",
	"parentId must be a doc or folder ID",
)

// importFailureCode is why one file was not imported. It is an error so a reader can return it, but it is only a
// per-file result: the other files of the request are still imported.
type importFailureCode string

func (code importFailureCode) Error() string {
	return string(code)
}

const (
	failInvalidFileType importFailureCode = "invalid_file_type"
	failFileTooLarge    importFailureCode = "file_too_large"
	failInvalidEncoding importFailureCode = "invalid_encoding"
	failInvalidTitle    importFailureCode = "invalid_title"
)

type importFile struct {
	fileName string
	title    string
	content  string
}

// Import creates one doc per valid file under the parent, at the end of its children, in the order of the files. A
// bad file is reported in Failed and does not stop the others; a bad parent or workspace fails the whole request.
func (service *Service) Import(
	ctx context.Context,
	workspaceID uuid.UUID,
	request importDocsRequest,
) (importDocsResponse, error) {
	parentID, err := parseParentID(request.ParentID)
	if err != nil {
		return importDocsResponse{}, err
	}

	files, failed, err := readImportFiles(request.Files)
	if err != nil {
		return importDocsResponse{}, err
	}

	response := importDocsResponse{Created: []importCreatedDoc{}, Failed: failed}

	err = service.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := service.treeService.LockWorkspace(tx, workspaceID)
		if err != nil {
			return err
		}

		err = service.treeService.CheckParent(tx, workspaceID, parentID)
		if err != nil {
			return err
		}

		for _, file := range files {
			doc, err := service.insertImportedDoc(tx, workspaceID, parentID, file)
			if err != nil {
				return err
			}

			created := importCreatedDoc{ID: doc.ID, Title: doc.Title, FileName: file.fileName}
			response.Created = append(response.Created, created)
		}

		if len(files) == 0 {
			return nil
		}

		return link.RelinkWorkspace(tx, workspaceID)
	})

	if err != nil {
		return importDocsResponse{}, err
	}

	return response, nil
}

func (service *Service) insertImportedDoc(
	tx *gorm.DB,
	workspaceID uuid.UUID,
	parentID *uuid.UUID,
	file importFile,
) (db.Doc, error) {
	parent, position, title, err := service.treeService.PlaceNewRenamed(
		tx,
		workspaceID,
		tree.KindDoc,
		parentID,
		file.title,
	)

	if err != nil {
		return db.Doc{}, err
	}

	doc := db.Doc{WorkspaceID: workspaceID, Title: title, Content: file.content, Position: position}
	doc.FolderID, doc.ParentDocID = tree.ToDocParentColumns(parent)

	err = tx.Create(&doc).Error

	return doc, err
}

func parseParentID(text string) (*uuid.UUID, error) {
	if text == "" {
		return nil, nil
	}

	id, err := uuid.Parse(text)
	if err != nil {
		return nil, errInvalidImportParent
	}

	return &id, nil
}

// readImportFiles splits the request files into the ones to import and the ones that failed a rule. Any other error
// (a file that cannot be read) fails the request.
func readImportFiles(headers []*multipart.FileHeader) ([]importFile, []importFailedFile, error) {
	files := []importFile{}
	failed := []importFailedFile{}

	for _, header := range headers {
		file, err := readImportFile(header)

		var code importFailureCode
		if errors.As(err, &code) {
			failed = append(failed, importFailedFile{FileName: header.Filename, Code: string(code)})
			continue
		}

		if err != nil {
			return nil, nil, err
		}

		files = append(files, file)
	}

	return files, failed, nil
}

func readImportFile(header *multipart.FileHeader) (importFile, error) {
	// Some clients send the whole path; only the last part is the file name.
	fileName := path.Base(strings.ReplaceAll(header.Filename, `\`, "/"))
	extension := path.Ext(fileName)

	if !strings.EqualFold(extension, markdownExtension) {
		return importFile{}, failInvalidFileType
	}

	if header.Size > maxImportFileSize {
		return importFile{}, failFileTooLarge
	}

	content, err := readImportContent(header)
	if err != nil {
		return importFile{}, err
	}

	title := tree.ToValidName(strings.TrimSuffix(fileName, extension))
	if title == "" {
		return importFile{}, failInvalidTitle
	}

	return importFile{fileName: header.Filename, title: title, content: content}, nil
}

func readImportContent(header *multipart.FileHeader) (string, error) {
	file, err := header.Open()
	if err != nil {
		return "", err
	}

	defer func() { _ = file.Close() }()

	raw, err := io.ReadAll(io.LimitReader(file, maxImportFileSize+1))
	if err != nil {
		return "", err
	}

	if len(raw) > maxImportFileSize {
		return "", failFileTooLarge
	}

	raw = bytes.TrimPrefix(raw, []byte("\xef\xbb\xbf"))

	// Postgres text cannot hold a NUL byte, so it counts as not text.
	if !utf8.Valid(raw) || bytes.IndexByte(raw, 0) >= 0 {
		return "", failInvalidEncoding
	}

	return string(raw), nil
}
