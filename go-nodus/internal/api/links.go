package api

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
)

// Wiki-links (docs/frd/FRD-wiki-link.md): [[Title]] in a note's content links to the note with that title.
// Links are always derived from content — rebuilt on every save, never edited directly.

var wikiLinkPattern = regexp.MustCompile(`\[\[([^\[\]]+)\]\]`)

type linkedNote struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
}

type noteLinks struct {
	Backlinks []linkedNote `json:"backlinks"`
	Outgoing  []linkedNote `json:"outgoing"`
}

type titleSuggestion struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}

type LinkHandler struct {
	db *gorm.DB
}

func NewLinkHandler(database *gorm.DB) *LinkHandler {
	return &LinkHandler{db: database}
}

func (h *LinkHandler) RegisterRoutes(r gin.IRouter) {
	r.GET("/notes/:id/links", h.getNoteLinks)
	r.GET("/notes/autocomplete", h.autocompleteTitles)
}

// GET /notes/:id/links — backlinks (notes linking here) and outgoing links, newest first.
// A self-link stays in outgoing (the preview renders it) but is not counted as a backlink.
func (h *LinkHandler) getNoteLinks(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}

	links := noteLinks{Backlinks: []linkedNote{}, Outgoing: []linkedNote{}}
	query := h.db.WithContext(c.Request.Context())

	// Raw SQL does not filter soft-deleted rows by itself.
	err := query.Raw(`
		SELECT n.id, n.title, nl.created_at
		FROM note_links nl JOIN notes n ON n.id = nl.source_note_id
		WHERE nl.target_note_id = ? AND nl.source_note_id <> ? AND n.deleted_at IS NULL
		ORDER BY nl.created_at DESC`, id, id).Scan(&links.Backlinks).Error
	if err == nil {
		err = query.Raw(`
			SELECT n.id, n.title, nl.created_at
			FROM note_links nl JOIN notes n ON n.id = nl.target_note_id
			WHERE nl.source_note_id = ? AND n.deleted_at IS NULL
			ORDER BY nl.created_at DESC`, id).Scan(&links.Outgoing).Error
	}
	if err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, links)
}

// GET /notes/autocomplete?q= — up to 10 titles starting with q (case-insensitive), for the editor's [[.
func (h *LinkHandler) autocompleteTitles(c *gin.Context) {
	suggestions := []titleSuggestion{}
	err := h.db.WithContext(c.Request.Context()).Model(&db.Note{}).
		Select("id", "title").
		Where("title ILIKE ?", likePattern("", c.Query("q"), "%")).
		Order("title ASC").Limit(10).
		Find(&suggestions).Error
	if err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, suggestions)
}

// rebuildLinks replaces the outgoing links of sourceID with the [[titles]] found in content.
// Titles of notes that do not exist are skipped (no note is created).
func rebuildLinks(tx *gorm.DB, sourceID uuid.UUID, content string) error {
	if err := tx.Where("source_note_id = ?", sourceID).Delete(&db.NoteLink{}).Error; err != nil {
		return err
	}

	titles := parseLinkedTitles(content)
	if len(titles) == 0 {
		return nil
	}

	var targets []db.Note
	if err := tx.Select("id", "title").Where("title IN ?", titles).Order("created_at ASC").Find(&targets).Error; err != nil {
		return err
	}

	// Titles are not unique yet (FRD-wiki-link limitation 4): link to the oldest note with that title.
	linked := make(map[string]bool, len(targets))
	links := make([]db.NoteLink, 0, len(targets))
	for _, target := range targets {
		if linked[target.Title] {
			continue
		}
		linked[target.Title] = true
		links = append(links, db.NoteLink{SourceNoteID: sourceID, TargetNoteID: target.ID})
	}
	if len(links) == 0 {
		return nil
	}

	return tx.Create(&links).Error
}

// parseLinkedTitles returns the [[titles]] in content, trimmed (as the preview renders them),
// in first-occurrence order without duplicates.
func parseLinkedTitles(content string) []string {
	matches := wikiLinkPattern.FindAllStringSubmatch(content, -1)

	seen := make(map[string]bool, len(matches))
	titles := make([]string, 0, len(matches))
	for _, match := range matches {
		title := strings.TrimSpace(match[1])
		if title == "" || seen[title] {
			continue
		}
		seen[title] = true
		titles = append(titles, title)
	}
	return titles
}
