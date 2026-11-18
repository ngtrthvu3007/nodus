package export

import (
	"slices"
	"testing"

	"github.com/google/uuid"

	"go-nodus/internal/modules/tree"
)

type fakeTree map[uuid.UUID][]tree.Node

func (fake fakeTree) Children(parentID uuid.UUID) []tree.Node {
	return fake[parentID]
}

func newNode(kind string, name string) tree.Node {
	return tree.Node{ID: uuid.New(), Kind: kind, Name: name}
}

func getPaths(entries []entry) []string {
	paths := make([]string, len(entries))
	for i, item := range entries {
		paths[i] = item.path
	}

	return paths
}

func TestBuildTreeEntries(t *testing.T) {
	overview := newNode(tree.KindDoc, "Overview")
	auth := newNode(tree.KindDoc, "Auth")
	login := newNode(tree.KindDoc, "Login")
	emptyFolder := newNode(tree.KindFolder, "Empty")
	clash1 := newNode(tree.KindDoc, "A:B")
	clash2 := newNode(tree.KindDoc, "A?B")

	root := uuid.New()
	lister := fakeTree{
		root:    {overview, auth, emptyFolder, clash1, clash2},
		auth.ID: {login},
	}

	got := getPaths(buildTreeEntries(lister, root, ""))
	want := []string{
		"01-Overview.md",
		"02-Auth/",
		"02-Auth/00-Auth.md",
		"02-Auth/01-Login.md",
		"03-Empty/",
		"04-A-B.md",
		"05-A-B.md",
	}

	if !slices.Equal(got, want) {
		t.Errorf("paths = %v, want %v", got, want)
	}
}

func TestBuildTreeEntriesHoldsDocContentOnFilesOnly(t *testing.T) {
	doc := newNode(tree.KindDoc, "Overview")
	folder := newNode(tree.KindFolder, "Backend")
	root := uuid.New()
	lister := fakeTree{root: {folder, doc}}

	entries := buildTreeEntries(lister, root, "")

	if entries[0].docID != uuid.Nil {
		t.Errorf("directory entry has docID %v, want none", entries[0].docID)
	}

	if entries[1].docID != doc.ID {
		t.Errorf("file entry has docID %v, want %v", entries[1].docID, doc.ID)
	}
}

func TestBuildTreeEntriesUsesThreeDigitsFromHundredItems(t *testing.T) {
	root := uuid.New()
	children := make([]tree.Node, 100)
	for i := range children {
		children[i] = newNode(tree.KindDoc, "Doc")
	}

	entries := buildTreeEntries(fakeTree{root: children}, root, "")

	if got := entries[0].path; got != "001-Doc.md" {
		t.Errorf("first path = %q, want 001-Doc.md", got)
	}

	if got := entries[99].path; got != "100-Doc.md" {
		t.Errorf("last path = %q, want 100-Doc.md", got)
	}
}
