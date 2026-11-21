package tree

import "github.com/google/uuid"

type Node struct {
	ID       uuid.UUID  `json:"id"`
	ParentID *uuid.UUID `json:"parentId"`
	Kind     string     `json:"kind"`
	Name     string     `json:"name"`
	Position int64      `json:"position"`
}

type Item struct {
	ID          uuid.UUID
	WorkspaceID uuid.UUID
	Kind        string
	Name        string
}

type MoveRequest struct {
	ParentID *uuid.UUID `json:"parentId"`
	AfterID  *uuid.UUID `json:"afterId"`
}

type Moved struct {
	ID       uuid.UUID  `json:"id"`
	ParentID *uuid.UUID `json:"parentId"`
	Position int64      `json:"position"`
}
