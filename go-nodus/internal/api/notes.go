package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"go-nodus/internal/db"
)

// Rules of the note tree (docs/frd/FRD-note-hierarchy.md, FRD-move-note.md): at most 2 levels;
// a child note has no folder of its own and inherits its parent's.

const maxTitleLength = 200

var (
	errNoteNotFound   = &apiError{http.StatusNotFound, "note_not_found", "Note is not found"}
	errInvalidTitle   = &apiError{http.StatusBadRequest, "invalid_params", "Title must be 1-200 characters"}
	errParentNotFound = &apiError{http.StatusBadRequest, "parent_not_found", "Parent note does not exist"}
	errParentNotRoot  = &apiError{http.StatusBadRequest, "parent_not_root", "Parent note must be a root note"}
	errSelfParent     = &apiError{http.StatusBadRequest, "self_parent", "Note cannot be its own parent"}
	errHasChildren    = &apiError{http.StatusBadRequest, "has_children", "Root note with children cannot be re-parented"}
	errFolderMissing  = &apiError{http.StatusBadRequest, "folder_not_found", "Folder does not exist"}
)

type createNoteRequest struct {
	Title        string     `json:"title" binding:"required"`
	Content      string     `json:"content"`
	FolderID     *uuid.UUID `json:"folderId"`
	ParentNoteID *uuid.UUID `json:"parentNoteId"`
}

type updateNoteRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
}

// moveNoteRequest: both keys must be sent, null means "none" — see bindMoveRequest.
type moveNoteRequest struct {
	FolderID     *uuid.UUID `json:"folderId"`
	ParentNoteID *uuid.UUID `json:"parentNoteId"`
}

type NoteHandler struct {
	db *gorm.DB
}

func NewNoteHandler(database *gorm.DB) *NoteHandler {
	return &NoteHandler{db: database}
}

func (h *NoteHandler) RegisterRoutes(r gin.IRouter) {
	r.GET("/notes", h.listNotes)
	r.POST("/notes", h.createNote)
	r.GET("/notes/:id", h.getNote)
	r.PUT("/notes/:id", h.updateNote)
	r.DELETE("/notes/:id", h.deleteNote)
	r.PATCH("/notes/:id/move", h.moveNote)
}

const hasChildrenSQL = "EXISTS (SELECT 1 FROM notes AS child WHERE child.parent_note_id = notes.id AND child.deleted_at IS NULL) AS has_children"

// notesQuery starts a query on notes with the computed hasChildren flag. GORM skips soft-deleted rows.
func notesQuery(tx *gorm.DB) *gorm.DB {
	return tx.Model(&db.Note{}).Select("notes.*, " + hasChildrenSQL)
}

// GET /notes?q= — newest-updated first; q filters by title or content.
func (h *NoteHandler) listNotes(c *gin.Context) {
	query := notesQuery(h.db.WithContext(c.Request.Context())).Order("notes.updated_at DESC")
	if q := c.Query("q"); q != "" {
		pattern := likePattern("%", q, "%")
		query = query.Where("(notes.title ILIKE ? OR notes.content ILIKE ?)", pattern, pattern)
	}

	notes := []db.Note{}
	if err := query.Find(&notes).Error; err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, notes)
}

func (h *NoteHandler) getNote(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}

	h.respondWithNote(c, id)
}

// POST /notes — with parentNoteId the note becomes a child and folderId is ignored.
// The note and its wiki-links are written in one transaction.
func (h *NoteHandler) createNote(c *gin.Context) {
	var req createNoteRequest
	if !bindJSON(c, &req) {
		return
	}
	title, err := normalizeTitle(req.Title)
	if err != nil {
		writeError(c, err)
		return
	}

	folderID := req.FolderID
	if req.ParentNoteID != nil {
		folderID = nil
	}
	note := db.Note{Title: title, Content: req.Content, FolderID: folderID, ParentNoteID: req.ParentNoteID}

	err = h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := checkPlacement(tx, folderID, req.ParentNoteID); err != nil {
			return err
		}
		if err := tx.Create(&note).Error; err != nil {
			return err
		}
		return rebuildLinks(tx, note.ID, note.Content)
	})
	if err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusCreated, note)
}

// PUT /notes/:id — title and content; the note's wiki-links are rebuilt in the same transaction.
func (h *NoteHandler) updateNote(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}
	var req updateNoteRequest
	if !bindJSON(c, &req) {
		return
	}
	title, err := normalizeTitle(req.Title)
	if err != nil {
		writeError(c, err)
		return
	}

	err = h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&db.Note{}).Where("id = ?", id).
			Updates(map[string]any{"title": title, "content": req.Content})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errNoteNotFound
		}
		return rebuildLinks(tx, id, req.Content)
	})
	if err != nil {
		writeError(c, err)
		return
	}

	h.respondWithNote(c, id)
}

// PATCH /notes/:id/move — parentNoteId wins when both are set; both null moves the note to root.
// Checks and update run in one transaction with row locks, so concurrent requests cannot build 3 levels.
func (h *NoteHandler) moveNote(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}
	req, ok := bindMoveRequest(c)
	if !ok {
		return
	}

	folderID := req.FolderID
	if req.ParentNoteID != nil {
		folderID = nil
	}

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := lockNote(tx, id); err != nil {
			return err
		}
		if req.ParentNoteID != nil {
			if err := checkCanBecomeChild(tx, id, *req.ParentNoteID); err != nil {
				return err
			}
		}
		if err := checkPlacement(tx, folderID, req.ParentNoteID); err != nil {
			return err
		}
		return tx.Model(&db.Note{}).Where("id = ?", id).
			Updates(map[string]any{"folder_id": nullable(folderID), "parent_note_id": nullable(req.ParentNoteID)}).Error
	})
	if err != nil {
		writeError(c, err)
		return
	}

	h.respondWithNote(c, id)
}

// DELETE /notes/:id — soft delete; child notes go with their parent in the same statement.
func (h *NoteHandler) deleteNote(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}

	result := h.db.WithContext(c.Request.Context()).
		Where("(id = ? OR parent_note_id = ?)", id, id).
		Delete(&db.Note{})
	if result.Error != nil {
		writeError(c, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(c, errNoteNotFound)
		return
	}

	writeOK(c, http.StatusOK, messageData{Message: "Delete success"})
}

func (h *NoteHandler) respondWithNote(c *gin.Context, id uuid.UUID) {
	var note db.Note
	err := notesQuery(h.db.WithContext(c.Request.Context())).Where("notes.id = ?", id).First(&note).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		err = errNoteNotFound
	}
	if err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, note)
}

// normalizeTitle trims the title and requires 1–200 characters (ADR-001 §6).
func normalizeTitle(title string) (string, error) {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" || utf8.RuneCountInString(trimmed) > maxTitleLength {
		return "", errInvalidTitle
	}
	return trimmed, nil
}

// checkPlacement validates where a note goes: under a root parent, or (without parent) into an existing folder.
func checkPlacement(tx *gorm.DB, folderID, parentID *uuid.UUID) error {
	if parentID != nil {
		return checkRootParent(tx, *parentID)
	}
	return checkFolderExists(tx, folderID)
}

// lockNote takes the note's row lock (FOR UPDATE) until the transaction ends: a concurrent move of it,
// or a child being created under it (checkRootParent takes FOR SHARE), waits for this transaction.
func lockNote(tx *gorm.DB, id uuid.UUID) error {
	var note db.Note
	err := tx.Clauses(clause.Locking{Strength: clause.LockingStrengthUpdate}).
		Select("id").Where("id = ?", id).First(&note).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errNoteNotFound
	}
	return err
}

// checkCanBecomeChild: a note cannot be its own parent, and a note with children cannot become a child
// (3 levels). Children are counted after lockNote, so a child created concurrently is seen.
func checkCanBecomeChild(tx *gorm.DB, id, parentID uuid.UUID) error {
	if parentID == id {
		return errSelfParent
	}

	var children int64
	if err := tx.Model(&db.Note{}).Where("parent_note_id = ?", id).Count(&children).Error; err != nil {
		return err
	}
	if children > 0 {
		return errHasChildren
	}
	return nil
}

// checkRootParent ensures parentID is an existing root note, so nesting never exceeds 2 levels.
// FOR SHARE keeps the parent from being moved under another note until the transaction ends.
func checkRootParent(tx *gorm.DB, parentID uuid.UUID) error {
	var parent db.Note
	err := tx.Clauses(clause.Locking{Strength: clause.LockingStrengthShare}).
		Select("id", "parent_note_id").Where("id = ?", parentID).First(&parent).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errParentNotFound
	}
	if err != nil {
		return err
	}
	if parent.ParentNoteID != nil {
		return errParentNotRoot
	}
	return nil
}

// checkFolderExists accepts nil (root). FOR SHARE keeps the folder from being deleted until the transaction ends.
func checkFolderExists(tx *gorm.DB, folderID *uuid.UUID) error {
	if folderID == nil {
		return nil
	}

	var folder db.Folder
	err := tx.Clauses(clause.Locking{Strength: clause.LockingStrengthShare}).
		Select("id").Where("id = ?", *folderID).First(&folder).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errFolderMissing
	}
	return err
}

// bindMoveRequest rejects a body that omits folderId or parentNoteId: an omitted key is a client bug,
// not a request to move to root.
func bindMoveRequest(c *gin.Context) (moveNoteRequest, bool) {
	var req moveNoteRequest

	body, err := c.GetRawData()
	var raw map[string]json.RawMessage
	if err != nil || json.Unmarshal(body, &raw) != nil || json.Unmarshal(body, &req) != nil {
		fail(c, http.StatusBadRequest, "invalid_body", "Invalid body")
		return req, false
	}

	for _, key := range []string{"folderId", "parentNoteId"} {
		if _, ok := raw[key]; !ok {
			fail(c, http.StatusBadRequest, "invalid_params", key+" is required (use null if none)")
			return req, false
		}
	}
	return req, true
}

// nullable turns a nil *uuid.UUID into SQL NULL inside an Updates map.
func nullable(id *uuid.UUID) any {
	if id == nil {
		return nil
	}
	return *id
}
