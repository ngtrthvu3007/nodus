package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
)

// Folders group root notes (docs/frd/FRD-folder.md). Deleting a folder deletes every note inside it.

var errFolderNotFound = &apiError{http.StatusNotFound, "folder_not_found", "Folder is not found"}

type folderRequest struct {
	Name string `json:"name" binding:"required"`
}

// folderDetail is a folder with its root notes.
type folderDetail struct {
	db.Folder
	Notes []db.Note `json:"notes"`
}

func (s *Server) folderRoutes(r gin.IRouter) {
	r.GET("/folders", s.listFolders)
	r.POST("/folders", s.createFolder)
	r.GET("/folders/:id", s.getFolder)
	r.PATCH("/folders/:id", s.renameFolder)
	r.DELETE("/folders/:id", s.deleteFolder)
}

const noteCountSQL = "(SELECT count(*) FROM notes WHERE notes.folder_id = folders.id AND notes.deleted_at IS NULL) AS note_count"

// folders starts a query on folders with the computed noteCount (root notes inside).
func (s *Server) folders(c *gin.Context) *gorm.DB {
	return s.db.WithContext(c.Request.Context()).Model(&db.Folder{}).Select("folders.*, " + noteCountSQL)
}

func (s *Server) listFolders(c *gin.Context) {
	folders := []db.Folder{}
	if err := s.folders(c).Order("folders.name ASC").Find(&folders).Error; err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, folders)
}

func (s *Server) getFolder(c *gin.Context) {
	id, ok := pathID(c, errFolderNotFound)
	if !ok {
		return
	}

	folder, err := s.findFolder(c, id)
	if err != nil {
		writeError(c, err)
		return
	}

	notes := []db.Note{}
	err = s.notes(c).Where("notes.folder_id = ? AND notes.parent_note_id IS NULL", id).Find(&notes).Error
	if err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, folderDetail{Folder: *folder, Notes: notes})
}

func (s *Server) createFolder(c *gin.Context) {
	var req folderRequest
	if !bindJSON(c, &req) {
		return
	}

	folder := db.Folder{Name: req.Name}
	if err := s.db.WithContext(c.Request.Context()).Create(&folder).Error; err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusCreated, folder)
}

func (s *Server) renameFolder(c *gin.Context) {
	id, ok := pathID(c, errFolderNotFound)
	if !ok {
		return
	}
	var req folderRequest
	if !bindJSON(c, &req) {
		return
	}

	result := s.db.WithContext(c.Request.Context()).Model(&db.Folder{}).Where("id = ?", id).Update("name", req.Name)
	if result.Error != nil {
		writeError(c, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(c, errFolderNotFound)
		return
	}

	folder, err := s.findFolder(c, id)
	if err != nil {
		writeError(c, err)
		return
	}
	writeOK(c, http.StatusOK, folder)
}

// DELETE /folders/:id — hard delete; the foreign keys cascade to every note inside.
func (s *Server) deleteFolder(c *gin.Context) {
	id, ok := pathID(c, errFolderNotFound)
	if !ok {
		return
	}

	result := s.db.WithContext(c.Request.Context()).Delete(&db.Folder{}, "id = ?", id)
	if result.Error != nil {
		writeError(c, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(c, errFolderNotFound)
		return
	}

	writeOK(c, http.StatusOK, messageData{Message: "Delete success"})
}

func (s *Server) findFolder(c *gin.Context, id uuid.UUID) (*db.Folder, error) {
	var folder db.Folder
	err := s.folders(c).Where("folders.id = ?", id).First(&folder).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errFolderNotFound
	}
	return &folder, err
}
