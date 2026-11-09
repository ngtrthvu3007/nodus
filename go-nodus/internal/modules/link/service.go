package link

import (
	"context"
	"regexp"
	"slices"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
)

const maxSuggestions = 10

var headingPattern = regexp.MustCompile(`^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$`)

type Service struct {
	db *gorm.DB
}

func NewService(database *gorm.DB) *Service {
	return &Service{db: database}
}

func (service *Service) GetDocLinks(ctx context.Context, docID uuid.UUID) (docLinks, error) {
	links := docLinks{Backlinks: []backlink{}, Outgoing: []outgoingLink{}}
	database := service.db.WithContext(ctx)

	doc, err := httpx.FindByID[db.Doc](database, docID, httpx.ErrDocNotFound)
	if err != nil {
		return links, err
	}

	loaded, err := loadWorkspace(database, doc.WorkspaceID)
	if err != nil {
		return links, err
	}

	var rows []db.DocLink
	err = database.Where("source_doc_id = ? OR (target_doc_id = ? AND source_doc_id <> ?)", docID, docID, docID).
		Find(&rows).Error

	if err != nil {
		return links, err
	}

	for _, row := range rows {
		if row.SourceDocID == docID {
			target := loaded.findTarget(row.TargetDocID)
			links.Outgoing = append(links.Outgoing, outgoingLink{Ref: row.TargetRef, Doc: target})

			continue
		}

		source := loaded.entries[row.SourceDocID]
		if source != nil {
			links.Backlinks = append(links.Backlinks, backlink{
				ID:    source.id,
				Title: source.name,
				Path:  loaded.buildPath(source),
			})
		}
	}

	slices.SortFunc(links.Backlinks, func(left, right backlink) int {
		return strings.Compare(strings.ToLower(left.Title), strings.ToLower(right.Title))
	})
	slices.SortFunc(links.Outgoing, func(left, right outgoingLink) int {
		return strings.Compare(strings.ToLower(left.Ref), strings.ToLower(right.Ref))
	})

	return links, nil
}

func (service *Service) AutocompleteTitles(
	ctx context.Context,
	workspaceID uuid.UUID,
	query string,
) ([]titleSuggestion, error) {
	database := service.db.WithContext(ctx)

	_, err := httpx.FindByID[db.Workspace](database, workspaceID, httpx.ErrWorkspaceNotFound)
	if err != nil {
		return nil, err
	}

	loaded, err := loadWorkspace(database, workspaceID)
	if err != nil {
		return nil, err
	}

	needle := strings.ToLower(strings.TrimSpace(query))
	docs := slices.Clone(loaded.docs)
	slices.SortStableFunc(docs, func(left, right *entry) int {
		return strings.Compare(left.key, right.key)
	})

	suggestions := []titleSuggestion{}
	for _, doc := range docs {
		if len(suggestions) == maxSuggestions {
			break
		}

		if strings.Contains(doc.key, needle) {
			suggestions = append(suggestions, titleSuggestion{
				ID:    doc.id,
				Title: doc.name,
				Path:  loaded.buildPath(doc),
				Ref:   loaded.buildShortestRef(doc),
			})
		}
	}

	return suggestions, nil
}

func (service *Service) GetHeadings(ctx context.Context, docID uuid.UUID) ([]heading, error) {
	doc, err := httpx.FindByID[db.Doc](service.db.WithContext(ctx), docID, httpx.ErrDocNotFound)
	if err != nil {
		return nil, err
	}

	return parseHeadings(doc.Content), nil
}

// ATX headings only; lines inside ``` or ~~~ fences are skipped.
func parseHeadings(content string) []heading {
	headings := []heading{}
	fence := ""

	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimRight(line, "\r")

		trimmed := strings.TrimSpace(line)

		if strings.HasPrefix(trimmed, "```") || strings.HasPrefix(trimmed, "~~~") {
			marker := trimmed[:3]

			switch fence {
			case "":
				fence = marker
			case marker:
				fence = ""
			}

			continue
		}

		match := headingPattern.FindStringSubmatch(line)
		if fence == "" && match != nil {
			headings = append(headings, heading{Level: len(match[1]), Text: match[2]})
		}
	}

	return headings
}
