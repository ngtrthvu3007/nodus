package export

import (
	"github.com/google/uuid"

	"go-nodus/internal/modules/tree"
)

// childLister is what the layout needs from tree.Index: the children of a node in reading order.
type childLister interface {
	Children(parentID uuid.UUID) []tree.Node
}

// buildTreeEntries lays out everything under parentID the way the sitemap reads: a folder is a directory, a doc with
// children is a directory holding its own file (number 00) and its children, a doc without children is a file.
// Siblings are numbered, so no two names in a directory can clash.
func buildTreeEntries(lister childLister, parentID uuid.UUID, directory string) []entry {
	children := lister.Children(parentID)
	width := getPrefixWidth(len(children))

	var entries []entry
	for position, child := range children {
		base := toPrefixedName(position+1, width, child.Name)
		grandchildren := lister.Children(child.ID)

		if child.Kind == tree.KindDoc && len(grandchildren) == 0 {
			entries = append(entries, entry{path: directory + base + markdownExtension, docID: child.ID})
			continue
		}

		childDirectory := directory + base + "/"
		entries = append(entries, entry{path: childDirectory})

		if child.Kind == tree.KindDoc {
			ownName := toPrefixedName(0, getPrefixWidth(len(grandchildren)), child.Name) + markdownExtension
			entries = append(entries, entry{path: childDirectory + ownName, docID: child.ID})
		}

		entries = append(entries, buildTreeEntries(lister, child.ID, childDirectory)...)
	}

	return entries
}
