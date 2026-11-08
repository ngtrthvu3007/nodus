package folder

import "github.com/google/uuid"

type createFolderRequest struct {
	Name        string     `json:"name" binding:"required"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parentId"`
}

// updateFolderRequest only changes the fields that are sent.
type updateFolderRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

type folderResponse struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parentId"`
	Position    int64      `json:"position"`
}

type childNode struct {
	ID   uuid.UUID `json:"id"`
	Kind string    `json:"kind"`
	Name string    `json:"name"`
}

type folderDetail struct {
	ID          uuid.UUID   `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	ParentID    *uuid.UUID  `json:"parentId"`
	Children    []childNode `json:"children"`
}
