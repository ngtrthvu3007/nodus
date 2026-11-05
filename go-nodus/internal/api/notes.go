package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
)

// Rules of the note tree (docs/frd/FRD-note-hierarchy.md, FRD-move-note.md): at most 2 levels;
// a child note has no folder of its own and inherits its parent's.

var (
	errNoteNotFound   = &apiError{http.StatusNotFound, "note_not_found", "Note is not found"}
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

func (s *Server) noteRoutes(r gin.IRouter) {
	r.GET("/notes", s.listNotes)
	r.POST("/notes", s.createNote)
	r.GET("/notes/:id", s.getNote)
	r.PUT("/notes/:id", s.updateNote)
	r.DELETE("/notes/:id", s.deleteNote)
	r.PATCH("/notes/:id/move", s.moveNote)
}

const hasChildrenSQL = "EXISTS (SELECT 1 FROM notes AS child WHERE child.parent_note_id = notes.id AND child.deleted_at IS NULL) AS has_children"

// notes starts a query on notes with the computed hasChildren flag. GORM skips soft-deleted rows.
func (s *Server) notes(c *gin.Context) *gorm.DB {
	return s.db.WithContext(c.Request.Context()).Model(&db.Note{}).Select("notes.*, " + hasChildrenSQL)
}

// GET /notes?q= — newest-updated first; q filters by title or content.
func (s *Server) listNotes(c *gin.Context) {
	query := s.notes(c).Order("notes.updated_at DESC")
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

func (s *Server) getNote(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}

	note, err := s.findNote(c, id)
	if err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, note)
}

// POST /notes — with parentNoteId the note becomes a child and folderId is ignored.
func (s *Server) createNote(c *gin.Context) {
	var req createNoteRequest
	if !bindJSON(c, &req) {
		return
	}

	folderID := req.FolderID
	if req.ParentNoteID != nil {
		if err := s.checkRootParent(c, *req.ParentNoteID); err != nil {
			writeError(c, err)
			return
		}
		folderID = nil
	} else if err := s.checkFolderExists(c, folderID); err != nil {
		writeError(c, err)
		return
	}

	note := db.Note{Title: req.Title, Content: req.Content, FolderID: folderID, ParentNoteID: req.ParentNoteID}
	if err := s.db.WithContext(c.Request.Context()).Create(&note).Error; err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusCreated, note)
}

// PUT /notes/:id — title and content; the note's wiki-links are rebuilt in the same transaction.
func (s *Server) updateNote(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}
	var req updateNoteRequest
	if !bindJSON(c, &req) {
		return
	}

	err := s.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&db.Note{}).Where("id = ?", id).
			Updates(map[string]any{"title": req.Title, "content": req.Content})
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

	s.respondWithNote(c, id)
}

// PATCH /notes/:id/move — parentNoteId wins when both are set; both null moves the note to root.
func (s *Server) moveNote(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}
	req, ok := bindMoveRequest(c)
	if !ok {
		return
	}

	note, err := s.findNote(c, id)
	if err != nil {
		writeError(c, err)
		return
	}

	folderID := req.FolderID
	if req.ParentNoteID != nil {
		if err := s.checkReparent(c, note, *req.ParentNoteID); err != nil {
			writeError(c, err)
			return
		}
		folderID = nil
	} else if err := s.checkFolderExists(c, folderID); err != nil {
		writeError(c, err)
		return
	}

	err = s.db.WithContext(c.Request.Context()).Model(&db.Note{}).Where("id = ?", id).
		Updates(map[string]any{"folder_id": nullable(folderID), "parent_note_id": nullable(req.ParentNoteID)}).Error
	if err != nil {
		writeError(c, err)
		return
	}

	s.respondWithNote(c, id)
}

// DELETE /notes/:id — soft delete; child notes go with their parent in the same statement.
func (s *Server) deleteNote(c *gin.Context) {
	id, ok := pathID(c, errNoteNotFound)
	if !ok {
		return
	}

	result := s.db.WithContext(c.Request.Context()).
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

func (s *Server) findNote(c *gin.Context, id uuid.UUID) (*db.Note, error) {
	var note db.Note
	err := s.notes(c).Where("notes.id = ?", id).First(&note).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errNoteNotFound
	}
	return &note, err
}

func (s *Server) respondWithNote(c *gin.Context, id uuid.UUID) {
	note, err := s.findNote(c, id)
	if err != nil {
		writeError(c, err)
		return
	}
	writeOK(c, http.StatusOK, note)
}

// checkRootParent ensures parentID is an existing root note, so nesting never exceeds 2 levels.
func (s *Server) checkRootParent(c *gin.Context, parentID uuid.UUID) error {
	var parent db.Note
	err := s.db.WithContext(c.Request.Context()).Select("id", "parent_note_id").Where("id = ?", parentID).First(&parent).Error
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

// checkReparent: a note with children cannot become a child (3 levels), nor its own parent.
func (s *Server) checkReparent(c *gin.Context, note *db.Note, parentID uuid.UUID) error {
	if parentID == note.ID {
		return errSelfParent
	}
	if note.HasChildren {
		return errHasChildren
	}
	return s.checkRootParent(c, parentID)
}

func (s *Server) checkFolderExists(c *gin.Context, folderID *uuid.UUID) error {
	if folderID == nil {
		return nil
	}

	var count int64
	if err := s.db.WithContext(c.Request.Context()).Model(&db.Folder{}).Where("id = ?", *folderID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return errFolderMissing
	}
	return nil
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
