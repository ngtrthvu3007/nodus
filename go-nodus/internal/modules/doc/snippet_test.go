package doc

import (
	"strings"
	"testing"
)

func TestBuildSnippet(t *testing.T) {
	long := strings.Repeat("a", 100) + " needle " + strings.Repeat("b", 200)

	tests := []struct {
		name    string
		content string
		keyword string
		check   func(snippet string) bool
	}{
		{"match in the middle is cut on both sides", long, "NEEDLE", func(snippet string) bool {
			return strings.HasPrefix(snippet, "…") && strings.HasSuffix(snippet, "…") &&
				strings.Contains(snippet, "needle")
		}},
		{"match at the start has no leading dots", "needle " + long, "needle", func(snippet string) bool {
			return !strings.HasPrefix(snippet, "…") && strings.HasPrefix(snippet, "needle")
		}},
		{"empty keyword takes the start of the content", long, "", func(snippet string) bool {
			return strings.HasPrefix(snippet, "aaa") && !strings.HasPrefix(snippet, "…")
		}},
		{"vietnamese is not broken", strings.Repeat("ế", 300) + "Kiến trúc", "kiến", func(snippet string) bool {
			return strings.Contains(snippet, "Kiến") && !strings.ContainsRune(snippet, '�')
		}},
		{"links and markers are cleaned", "# Title\n- see [[Auth]]\n```go\ncode\n```", "", func(snippet string) bool {
			return snippet == "Title see Auth code"
		}},
	}

	for _, test := range tests {
		snippet := buildSnippet(test.content, test.keyword)
		if !test.check(snippet) {
			t.Errorf("%s: got %q", test.name, snippet)
		}
	}
}

func TestEscapeLike(t *testing.T) {
	if got := escapeLike(`100%_a\b`); got != `100\%\_a\\b` {
		t.Errorf("got %q", got)
	}
}
