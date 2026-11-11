package link

import (
	"regexp"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
)

var wikiLinkPattern = regexp.MustCompile(`\[\[([^\[\]]+)\]\]`)
var codeSpanPattern = regexp.MustCompile("`[^`]*`")

// RelinkWorkspace rebuilds every link of the workspace from the current content and tree.
// Call it inside the transaction of any write that changes a doc's content, title or place,
// or a folder's name or place.
// ponytail: whole workspace per write; relink only the affected docs when it gets slow.
func RelinkWorkspace(tx *gorm.DB, workspaceID uuid.UUID) error {
	loaded, err := loadWorkspace(tx, workspaceID)
	if err != nil {
		return err
	}

	var sources []db.Doc
	err = tx.Select("id", "content").Where("workspace_id = ?", workspaceID).Find(&sources).Error
	if err != nil {
		return err
	}

	workspaceDocIDs := tx.Unscoped().Model(&db.Doc{}).Select("id").Where("workspace_id = ?", workspaceID)

	err = tx.Where("source_doc_id IN (?)", workspaceDocIDs).Delete(&db.DocLink{}).Error
	if err != nil {
		return err
	}

	links := []db.DocLink{}
	for _, sourceDoc := range sources {
		source := loaded.entries[sourceDoc.ID]

		for _, ref := range parseRefs(sourceDoc.Content) {
			link := db.DocLink{SourceDocID: source.id, TargetRef: ref}

			target := loaded.resolve(source, splitRef(ref))
			if target != nil {
				link.TargetDocID = &target.id
			}

			links = append(links, link)
		}
	}

	if len(links) == 0 {
		return nil
	}

	return tx.CreateInBatches(&links, 500).Error
}

// Refs are trimmed, without #heading, one per case-insensitive target. Code is not text: like the preview, a `[[x]]`
// in a code span or a fenced block is not a link.
func parseRefs(content string) []string {
	seen := map[string]bool{}
	refs := []string{}

	for _, match := range wikiLinkPattern.FindAllStringSubmatch(removeCode(content), -1) {
		ref, _, _ := strings.Cut(match[1], "#")
		ref = strings.TrimSpace(ref)
		key := strings.ToLower(ref)

		if ref == "" || seen[key] {
			continue
		}

		seen[key] = true
		refs = append(refs, ref)
	}

	return refs
}

func removeCode(content string) string {
	lines := outsideFences(content)

	for i, line := range lines {
		lines[i] = codeSpanPattern.ReplaceAllString(line, "")
	}

	return strings.Join(lines, "\n")
}

// The lines that are not inside a ``` or ~~~ fence; the fence lines are left out too.
func outsideFences(content string) []string {
	lines := []string{}
	fence := ""

	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimRight(line, "\r")
		trimmed := strings.TrimSpace(line)

		if strings.HasPrefix(trimmed, "```") || strings.HasPrefix(trimmed, "~~~") {
			marker := trimmed[:3]

			switch fence {
			case "":
				fence = marker
			case marker:
				fence = ""
			}

			continue
		}

		if fence == "" {
			lines = append(lines, line)
		}
	}

	return lines
}

// Returns nil for an empty segment or a path deeper than the tree.
func splitRef(ref string) []string {
	segments := strings.Split(strings.ToLower(ref), "/")
	if len(segments) > maxSegments {
		return nil
	}

	for i, segment := range segments {
		segments[i] = strings.TrimSpace(segment)
		if segments[i] == "" {
			return nil
		}
	}

	return segments
}
