package link

import (
	"slices"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
	"go-nodus/internal/modules/tree"
)

// ponytail: whole workspace loaded per call; SQL queries if workspaces grow large.

const maxSegments = 4

type entry struct {
	id       uuid.UUID
	parentID *uuid.UUID
	name     string
	key      string
}

// workspace holds every live folder and doc; docs is oldest first.
type workspace struct {
	entries map[uuid.UUID]*entry
	docs    []*entry
}

func loadWorkspace(tx *gorm.DB, workspaceID uuid.UUID) (*workspace, error) {
	var folders []db.Folder
	err := tx.Select("id", "parent_folder_id", "name").
		Where("workspace_id = ?", workspaceID).Find(&folders).Error

	if err != nil {
		return nil, err
	}

	var docs []db.Doc
	err = tx.Select("id", "folder_id", "parent_doc_id", "title").
		Where("workspace_id = ?", workspaceID).Order("created_at ASC, id ASC").Find(&docs).Error

	if err != nil {
		return nil, err
	}

	loaded := &workspace{entries: map[uuid.UUID]*entry{}}
	for _, folder := range folders {
		loaded.entries[folder.ID] = &entry{
			id:       folder.ID,
			parentID: folder.ParentFolderID,
			name:     folder.Name,
			key:      strings.ToLower(folder.Name),
		}
	}

	for _, doc := range docs {
		item := &entry{
			id:       doc.ID,
			parentID: tree.GetParentID(tree.GetDocParent(&doc)),
			name:     doc.Title,
			key:      strings.ToLower(doc.Title),
		}
		loaded.entries[doc.ID] = item
		loaded.docs = append(loaded.docs, item)
	}

	return loaded, nil
}

// Nearest parent first.
func (loaded *workspace) getAncestors(item *entry) []*entry {
	ancestors := []*entry{}

	for parentID := item.parentID; parentID != nil; {
		parent, found := loaded.entries[*parentID]
		if !found {
			break
		}

		ancestors = append(ancestors, parent)
		parentID = parent.parentID
	}

	return ancestors
}

// Segments are lowercase, outermost first; the last one is the doc title.
func (loaded *workspace) findDocs(segments []string) []*entry {
	title := segments[len(segments)-1]
	parents := segments[:len(segments)-1]
	found := []*entry{}

	for _, doc := range loaded.docs {
		if doc.key == title && loaded.hasParents(doc, parents) {
			found = append(found, doc)
		}
	}

	return found
}

func (loaded *workspace) hasParents(doc *entry, parents []string) bool {
	ancestors := loaded.getAncestors(doc)
	if len(ancestors) < len(parents) {
		return false
	}

	for i, parent := range parents {
		if ancestors[len(parents)-1-i].key != parent {
			return false
		}
	}

	return true
}

// A path matching many docs picks the oldest; a bare title picks the nearest to the source, then the oldest.
func (loaded *workspace) resolve(source *entry, segments []string) *entry {
	if len(segments) == 0 {
		return nil
	}

	found := loaded.findDocs(segments)
	if len(found) == 0 {
		return nil
	}

	if len(segments) > 1 {
		return found[0]
	}

	sourceAncestors := loaded.getAncestors(source)
	best, bestScore := found[0], -1

	for _, candidate := range found {
		score := countShared(sourceAncestors, loaded.getAncestors(candidate)) * 2
		if isSameParent(source.parentID, candidate.parentID) {
			score++
		}

		if score > bestScore {
			best, bestScore = candidate, score
		}
	}

	return best
}

// Counts the common ancestors from the root down.
func countShared(left, right []*entry) int {
	shared := 0

	for shared < len(left) && shared < len(right) &&
		left[len(left)-1-shared].id == right[len(right)-1-shared].id {
		shared++
	}

	return shared
}

func isSameParent(left, right *uuid.UUID) bool {
	if left == nil || right == nil {
		return left == right
	}

	return *left == *right
}

// Shortest path suffix that still points to one doc only.
func (loaded *workspace) buildShortestRef(doc *entry) string {
	chain := loaded.getAncestors(doc)
	slices.Reverse(chain)
	chain = append(chain, doc)

	for size := 1; ; size++ {
		suffix := chain[len(chain)-size:]
		if size == len(chain) || len(loaded.findDocs(getKeys(suffix))) == 1 {
			return joinNames(suffix, "/")
		}
	}
}

func (loaded *workspace) buildPath(doc *entry) string {
	ancestors := loaded.getAncestors(doc)
	slices.Reverse(ancestors)

	return joinNames(ancestors, " / ")
}

func (loaded *workspace) findTarget(id *uuid.UUID) *linkTarget {
	if id == nil {
		return nil
	}

	target := loaded.entries[*id]
	if target == nil {
		return nil
	}

	return &linkTarget{ID: target.id, Title: target.name}
}

func getKeys(items []*entry) []string {
	keys := make([]string, 0, len(items))
	for _, item := range items {
		keys = append(keys, item.key)
	}

	return keys
}

func joinNames(items []*entry, separator string) string {
	names := make([]string, 0, len(items))
	for _, item := range items {
		names = append(names, item.name)
	}

	return strings.Join(names, separator)
}
