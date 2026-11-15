package export

import (
	"strings"
	"testing"
)

func TestToFileName(t *testing.T) {
	longName := strings.Repeat("a", 150)

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"plain", "Overview", "Overview"},
		{"forbidden characters", `a\b:c*d?e"f<g>h|i`, "a-b-c-d-e-f-g-h-i"},
		{"control character", "a\tb\x00c", "a-b-c"},
		{"keeps unicode", "Tổng quan", "Tổng quan"},
		{"cuts to 100 characters", longName, strings.Repeat("a", 100)},
		{"cuts characters, not bytes", strings.Repeat("ế", 150), strings.Repeat("ế", 100)},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := toFileName(test.input); got != test.want {
				t.Errorf("toFileName(%q) = %q, want %q", test.input, got, test.want)
			}
		})
	}
}

func TestToPrefixedName(t *testing.T) {
	tests := []struct {
		number int
		width  int
		want   string
	}{
		{1, 2, "01-Auth"},
		{12, 2, "12-Auth"},
		{7, 3, "007-Auth"},
		{100, 3, "100-Auth"},
	}

	for _, test := range tests {
		if got := toPrefixedName(test.number, test.width, "Auth"); got != test.want {
			t.Errorf("toPrefixedName(%d, %d) = %q, want %q", test.number, test.width, got, test.want)
		}
	}
}

func TestGetPrefixWidth(t *testing.T) {
	tests := map[int]int{0: 2, 1: 2, 99: 2, 100: 3, 999: 3, 1000: 4}

	for count, want := range tests {
		if got := getPrefixWidth(count); got != want {
			t.Errorf("getPrefixWidth(%d) = %d, want %d", count, got, want)
		}
	}
}

func TestTakeNameAddsNumberOnClash(t *testing.T) {
	used := map[string]bool{}

	got := []string{
		takeName(used, "A-B", ".md"),
		takeName(used, "A-B", ".md"),
		takeName(used, "a-b", ".md"),
		takeName(used, "A-B", ".md"),
		takeName(used, "A-B", ""),
	}
	want := []string{"A-B.md", "A-B-2.md", "a-b-3.md", "A-B-4.md", "A-B"}

	for i := range want {
		if got[i] != want[i] {
			t.Errorf("take #%d = %q, want %q", i+1, got[i], want[i])
		}
	}
}
