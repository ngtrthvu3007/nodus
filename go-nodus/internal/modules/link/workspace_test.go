package link

import (
	"strings"
	"testing"

	"github.com/google/uuid"
)

func newDoc(name string, parentID *uuid.UUID) *entry {
	return &entry{id: uuid.New(), parentID: parentID, name: name, key: strings.ToLower(name)}
}

func TestResolve(t *testing.T) {
	backend, frontend := uuid.New(), uuid.New()

	inFrontend := newDoc("overview", &frontend)
	inBackend := newDoc("overview", &backend)
	source := newDoc("auth", &backend)
	rootSource := newDoc("home", nil)

	loaded := &workspace{
		entries: map[uuid.UUID]*entry{
			backend:  {id: backend, name: "Backend", key: "backend"},
			frontend: {id: frontend, name: "Frontend", key: "frontend"},
		},
		docs: []*entry{inFrontend, inBackend},
	}

	if got := loaded.resolve(source, []string{"overview"}); got != inBackend {
		t.Fatal("same parent must win over the older doc")
	}

	if got := loaded.resolve(rootSource, []string{"overview"}); got != inFrontend {
		t.Fatal("no nearer doc: the oldest must win")
	}

	if got := loaded.resolve(source, []string{"frontend", "overview"}); got != inFrontend {
		t.Fatal("path must pick the doc under Frontend")
	}

	if got := loaded.resolve(source, []string{"missing"}); got != nil {
		t.Fatal("unknown title must stay broken")
	}

	if got := loaded.buildShortestRef(inBackend); got != "Backend/overview" {
		t.Fatalf("shortest ref = %q", got)
	}
}

func TestParseRefs(t *testing.T) {
	refs := parseRefs("[[ AWS ]] [[aws#Setup]] [[A/B/C]] [[#only]] [[ ]]")

	if len(refs) != 2 || refs[0] != "AWS" || refs[1] != "A/B/C" {
		t.Fatalf("refs = %v", refs)
	}

	refs = parseRefs("`[[a]]` [[b]]\n```md\n[[c]]\n```\n~~~\n[[d]]\n~~~\n[[e]]")
	if len(refs) != 2 || refs[0] != "b" || refs[1] != "e" {
		t.Fatalf("refs without code = %v", refs)
	}
}

func TestParseHeadings(t *testing.T) {
	headings := parseHeadings("# One\n```\n# not a heading\n```\n## Two ##\n#nospace\n### C#")

	if len(headings) != 3 || headings[1].Text != "Two" || headings[2].Text != "C#" || headings[2].Level != 3 {
		t.Fatalf("headings = %v", headings)
	}
}
