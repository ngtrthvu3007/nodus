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

type FolderHandler struct {
	db *gorm.DB
}

func NewFolderHandler(database *gorm.DB) *FolderHandler {
	return &FolderHandler{db: database}
}

func (h *FolderHandler) RegisterRoutes(r gin.IRouter) {
	r.GET("/folders", h.listFolders)
	r.POST("/folders", h.createFolder)
	r.GET("/folders/:id", h.getFolder)
	r.PATCH("/folders/:id", h.renameFolder)
	r.DELETE("/folders/:id", h.deleteFolder)
}

const noteCountSQL = "(SELECT count(*) FROM notes WHERE notes.folder_id = folders.id AND notes.deleted_at IS NULL) AS note_count"

// foldersQuery starts a query on folders with the computed noteCount (root notes inside).
func foldersQuery(tx *gorm.DB) *gorm.DB {
	return tx.Model(&db.Folder{}).Select("folders.*, " + noteCountSQL)
}

func (h *FolderHandler) listFolders(c *gin.Context) {
	folders := []db.Folder{}
	if err := foldersQuery(h.db.WithContext(c.Request.Context())).Order("folders.name ASC").Find(&folders).Error; err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, folders)
}

func (h *FolderHandler) getFolder(c *gin.Context) {
	id, ok := pathID(c, errFolderNotFound)
	if !ok {
		return
	}

	database := h.db.WithContext(c.Request.Context())
	folder, err := findFolder(database, id)
	if err != nil {
		writeError(c, err)
		return
	}

	notes := []db.Note{}
	err = notesQuery(database).Where("notes.folder_id = ? AND notes.parent_note_id IS NULL", id).Find(&notes).Error
	if err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusOK, folderDetail{Folder: *folder, Notes: notes})
}

func (h *FolderHandler) createFolder(c *gin.Context) {
	var req folderRequest
	if !bindJSON(c, &req) {
		return
	}

	folder := db.Folder{Name: req.Name}
	if err := h.db.WithContext(c.Request.Context()).Create(&folder).Error; err != nil {
		writeError(c, err)
		return
	}

	writeOK(c, http.StatusCreated, folder)
}

func (h *FolderHandler) renameFolder(c *gin.Context) {
	id, ok := pathID(c, errFolderNotFound)
	if !ok {
		return
	}
	var req folderRequest
	if !bindJSON(c, &req) {
		return
	}

	result := h.db.WithContext(c.Request.Context()).Model(&db.Folder{}).Where("id = ?", id).Update("name", req.Name)
	if result.Error != nil {
		writeError(c, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(c, errFolderNotFound)
		return
	}

	folder, err := findFolder(h.db.WithContext(c.Request.Context()), id)
	if err != nil {
		writeError(c, err)
		return
	}
	writeOK(c, http.StatusOK, folder)
}

// DELETE /folders/:id — hard delete; the foreign keys cascade to every note inside.
func (h *FolderHandler) deleteFolder(c *gin.Context) {
	id, ok := pathID(c, errFolderNotFound)
	if !ok {
		return
	}

	result := h.db.WithContext(c.Request.Context()).Delete(&db.Folder{}, "id = ?", id)
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

func findFolder(tx *gorm.DB, id uuid.UUID) (*db.Folder, error) {
	var folder db.Folder
	err := foldersQuery(tx).Where("folders.id = ?", id).First(&folder).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errFolderNotFound
	}
	return &folder, err
}
