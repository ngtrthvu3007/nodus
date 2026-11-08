package link

import (
	"context"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
)

var wikiLinkPattern = regexp.MustCompile(`\[\[([^\[\]]+)\]\]`)

type Service struct {
	db *gorm.DB
}

func NewService(database *gorm.DB) *Service {
	return &Service{db: database}
}

// Newest first. Preload skips deleted docs, so links to them are left out.
func (service *Service) GetDocLinks(ctx context.Context, docID uuid.UUID) (docLinks, error) {
	links := docLinks{Backlinks: []linkedDoc{}, Outgoing: []linkedDoc{}}
	database := service.db.WithContext(ctx)

	_, err := httpx.FindByID[db.Doc](database, docID, httpx.ErrDocNotFound)
	if err != nil {
		return links, err
	}

	var backlinks []db.DocLink
	err = database.Preload("SourceDoc", selectIDAndTitle).
		Where("target_doc_id = ? AND source_doc_id <> ?", docID, docID).
		Order("created_at DESC").Find(&backlinks).Error

	if err != nil {
		return links, err
	}

	for _, backlink := range backlinks {
		source := backlink.SourceDoc
		if source != nil {
			links.Backlinks = append(links.Backlinks, linkedDoc{
				ID:        source.ID,
				Title:     source.Title,
				CreatedAt: backlink.CreatedAt,
			})
		}
	}

	var outgoing []db.DocLink
	err = database.Preload("TargetDoc", selectIDAndTitle).
		Where("source_doc_id = ?", docID).
		Order("created_at DESC").Find(&outgoing).Error

	if err != nil {
		return links, err
	}

	for _, outgoingLink := range outgoing {
		target := outgoingLink.TargetDoc
		if target != nil {
			links.Outgoing = append(links.Outgoing, linkedDoc{
				ID:        target.ID,
				Title:     target.Title,
				CreatedAt: outgoingLink.CreatedAt,
			})
		}
	}

	return links, nil
}

func selectIDAndTitle(database *gorm.DB) *gorm.DB {
	return database.Select("id", "title")
}

func (service *Service) AutocompleteTitles(
	ctx context.Context,
	workspaceID uuid.UUID,
	query string,
) ([]titleSuggestion, error) {
	suggestions := []titleSuggestion{}
	titlePrefix := buildLikePattern(query) + "%"

	err := service.db.WithContext(ctx).Model(&db.Doc{}).
		Select("id", "title").
		Where("workspace_id = ? AND title ILIKE ?", workspaceID, titlePrefix).
		Order("title ASC").Limit(10).
		Find(&suggestions).Error

	return suggestions, err
}

// Replaces the outgoing links of a doc with the [[titles]] in its content.
// Titles that match no doc are skipped.
func RebuildLinks(tx *gorm.DB, workspaceID uuid.UUID, sourceID uuid.UUID, content string) error {
	err := tx.Where("source_doc_id = ?", sourceID).Delete(&db.DocLink{}).Error
	if err != nil {
		return err
	}

	titles := parseLinkedTitles(content)
	if len(titles) == 0 {
		return nil
	}

	var targets []db.Doc
	err = tx.Select("id", "title").
		Where("workspace_id = ? AND title IN ?", workspaceID, titles).
		Order("created_at ASC").Find(&targets).Error

	if err != nil {
		return err
	}

	// Titles are unique per parent only, so link to the oldest doc of each title.
	linked := map[string]bool{}
	links := []db.DocLink{}
	for _, target := range targets {
		if linked[target.Title] {
			continue
		}

		linked[target.Title] = true
		links = append(links, db.DocLink{
			SourceDocID: sourceID,
			TargetDocID: target.ID,
		})
	}

	if len(links) == 0 {
		return nil
	}

	return tx.Create(&links).Error
}

func parseLinkedTitles(content string) []string {
	seen := map[string]bool{}
	titles := []string{}

	for _, match := range wikiLinkPattern.FindAllStringSubmatch(content, -1) {
		title := strings.TrimSpace(match[1])
		if title == "" || seen[title] {
			continue
		}

		seen[title] = true
		titles = append(titles, title)
	}

	return titles
}

func buildLikePattern(value string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
}
