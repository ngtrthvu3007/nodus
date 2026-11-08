package tree

import (
	"net/http"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"

	"go-nodus/internal/db"
	"go-nodus/internal/httpx"
)

// ponytail: whole tree loaded per write, one writer per workspace; SQL depth queries and finer locks if it grows.

const (
	KindFolder = "folder"
	KindDoc    = "doc"

	maxDepth                 = 4
	maxNameLength            = 200
	forbiddenNameChars       = "/#|[]"
	positionStep       int64 = 1024
)

var (
	errInvalidName = httpx.NewError(
		http.StatusBadRequest,
		"invalid_params",
		"Name must be 1-200 characters without / # | [ ]",
	)
	errInvalidParent = httpx.NewError(
		http.StatusBadRequest,
		"invalid_params",
		"Parent does not exist or cannot hold this item",
	)
	errInvalidAfter = httpx.NewError(
		http.StatusBadRequest,
		"invalid_params",
		"afterId must be an item in the new parent",
	)
	errMaxDepth = httpx.NewError(http.StatusBadRequest, "max_depth_exceeded", "The tree is at most 4 levels deep")
	errCycle    = httpx.NewError(
		http.StatusBadRequest,
		"cycle",
		"Cannot move an item into itself or its own subtree",
	)
	errNameConflict = httpx.NewError(
		http.StatusConflict,
		"name_conflict",
		"Another item with this name exists in the same parent",
	)
)

type Index struct {
	nodes    map[uuid.UUID]Node
	children map[uuid.UUID][]Node
}

func newIndex(nodes []Node) *Index {
	index := &Index{
		nodes:    map[uuid.UUID]Node{},
		children: map[uuid.UUID][]Node{},
	}

	for _, node := range nodes {
		parentKey := uuid.Nil
		if node.ParentID != nil {
			parentKey = *node.ParentID
		}

		index.nodes[node.ID] = node
		index.children[parentKey] = append(index.children[parentKey], node)
	}

	return index
}

func (index *Index) countDepth(id uuid.UUID) int {
	depth := 0

	for {
		node, found := index.nodes[id]
		if !found {
			return depth
		}

		depth++
		if node.ParentID == nil {
			return depth
		}

		id = *node.ParentID
	}
}

func (index *Index) countHeight(id uuid.UUID) int {
	height := 0
	for _, child := range index.children[id] {
		height = max(height, index.countHeight(child.ID))
	}

	return height + 1
}

func (index *Index) Children(parentID uuid.UUID) []Node {
	return index.children[parentID]
}

func (index *Index) CollectSubtree(id uuid.UUID) []uuid.UUID {
	ids := []uuid.UUID{id}
	for _, child := range index.children[id] {
		ids = append(ids, index.CollectSubtree(child.ID)...)
	}

	return ids
}

func (index *Index) findSiblings(parent *Node) []Node {
	parentKey := uuid.Nil
	if parent != nil {
		parentKey = parent.ID
	}

	return slices.Clone(index.children[parentKey])
}

func GetParentID(parent *Node) *uuid.UUID {
	if parent == nil {
		return nil
	}

	return &parent.ID
}

func GetFolderParent(folder *db.Folder) *Node {
	if folder.ParentFolderID == nil {
		return nil
	}

	return &Node{ID: *folder.ParentFolderID, Kind: KindFolder}
}

func GetDocParent(doc *db.Doc) *Node {
	switch {
	case doc.FolderID != nil:
		return &Node{ID: *doc.FolderID, Kind: KindFolder}
	case doc.ParentDocID != nil:
		return &Node{ID: *doc.ParentDocID, Kind: KindDoc}
	}

	return nil
}

// A folder parent fills folder_id, a doc parent fills parent_doc_id.
func ToDocParentColumns(parent *Node) (folderID, parentDocID *uuid.UUID) {
	if parent == nil {
		return nil, nil
	}

	if parent.Kind == KindFolder {
		return &parent.ID, nil
	}

	return nil, &parent.ID
}

func ValidateName(name string) (string, error) {
	trimmed := strings.TrimSpace(name)
	tooLong := utf8.RuneCountInString(trimmed) > maxNameLength
	hasForbiddenChar := strings.ContainsAny(trimmed, forbiddenNameChars)

	if trimmed == "" || tooLong || hasForbiddenChar {
		return "", errInvalidName
	}

	return trimmed, nil
}

func resolveParent(index *Index, id *uuid.UUID) (*Node, error) {
	if id == nil {
		return nil, nil
	}

	node, found := index.nodes[*id]
	if !found {
		return nil, errInvalidParent
	}

	return &node, nil
}

func isNameTaken(items []Node, name string) bool {
	return slices.ContainsFunc(items, func(item Node) bool {
		return strings.EqualFold(item.Name, name)
	})
}

func excludeNode(items []Node, id uuid.UUID) []Node {
	return slices.DeleteFunc(items, func(item Node) bool {
		return item.ID == id
	})
}

func checkPlacement(index *Index, item Item, parent *Node, height int) ([]Node, error) {
	if item.Kind == KindFolder && parent != nil && parent.Kind == KindDoc {
		return nil, errInvalidParent
	}

	depth := 0
	if parent != nil {
		depth = index.countDepth(parent.ID)
	}

	if depth+height > maxDepth {
		return nil, errMaxDepth
	}

	siblings := excludeNode(index.findSiblings(parent), item.ID)
	nameTaken := isNameTaken(siblings, item.Name)

	if nameTaken {
		return nil, errNameConflict
	}

	return siblings, nil
}

func getPositionBetween(items []Node, index int) (int64, bool) {
	var low int64
	if index >= 0 {
		low = items[index].Position
	}

	if index+1 >= len(items) {
		return low + positionStep, true
	}

	middle := low + (items[index+1].Position-low)/2

	return middle, middle > low
}
