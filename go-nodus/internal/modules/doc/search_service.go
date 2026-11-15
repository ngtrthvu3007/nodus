package doc

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
)

const maxSearchLimit = 100

func (service *Service) Search(
	ctx context.Context,
	workspaceID uuid.UUID,
	request searchDocsRequest,
) (searchDocsResponse, error) {
	database := service.db.WithContext(ctx)

	_, err := httpx.FindByID[db.Workspace](database, workspaceID, httpx.ErrWorkspaceNotFound)
	if err != nil {
		return searchDocsResponse{}, err
	}

	limit := min(request.Limit, maxSearchLimit)
	keyword := strings.TrimSpace(request.Query)

	query := database.Where("workspace_id = ?", workspaceID)
	if keyword != "" {
		pattern := "%" + escapeLike(keyword) + "%"
		query = query.Where("(title ILIKE ? OR content ILIKE ?)", pattern, pattern)
	}

	// One extra row tells whether another page exists.
	var docs []db.Doc
	err = query.Select("id", "folder_id", "parent_doc_id", "title", "content", "updated_at").
		Order("updated_at DESC, id DESC").Limit(limit + 1).Offset(request.Offset).Find(&docs).Error

	if err != nil {
		return searchDocsResponse{}, err
	}

	hasMore := len(docs) > limit
	docs = docs[:min(len(docs), limit)]

	paths, err := loadPaths(database, docs)
	if err != nil {
		return searchDocsResponse{}, err
	}

	items := make([]searchDocResult, 0, len(docs))
	for _, doc := range docs {
		items = append(items, searchDocResult{
			ID:        doc.ID,
			Title:     doc.Title,
			Path:      paths[doc.ID],
			Snippet:   buildSnippet(doc.Content, keyword),
			UpdatedAt: doc.UpdatedAt,
		})
	}

	return searchDocsResponse{Items: items, Limit: limit, Offset: request.Offset, HasMore: hasMore}, nil
}

// `\` is Postgres' default LIKE escape character.
func escapeLike(text string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(text)
}
