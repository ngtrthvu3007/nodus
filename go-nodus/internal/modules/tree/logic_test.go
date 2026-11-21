package tree

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestToValidName(t *testing.T) {
	longName := strings.Repeat("a", maxNameLength+50)

	tests := []struct {
		text string
		want string
	}{
		{"  Tổng quan  ", "Tổng quan"},
		{"a/b#c|d[e]f", "a-b-c-d-e-f"},
		{"01-Intro", "01-Intro"},
		{"   ", ""},
		{"Tổng quan", "Tổng quan"},
		{longName, strings.Repeat("a", maxNameLength)},
	}

	for _, test := range tests {
		got := ToValidName(test.text)
		if got != test.want {
			t.Errorf("ToValidName(%q) = %q, want %q", test.text, got, test.want)
		}

		if got != "" {
			_, err := ValidateName(got)
			if err != nil {
				t.Errorf("ToValidName(%q) = %q does not pass ValidateName", test.text, got)
			}
		}
	}
}

func TestFindFreeName(t *testing.T) {
	siblings := []Node{{Name: "Intro"}, {Name: "intro-2"}}

	if got := findFreeName(siblings, "Guide"); got != "Guide" {
		t.Errorf("free name changed: %q", got)
	}

	if got := findFreeName(siblings, "INTRO"); got != "INTRO-3" {
		t.Errorf("taken name = %q, want INTRO-3 (case-insensitive, skips the taken -2)", got)
	}

	longName := strings.Repeat("a", maxNameLength)
	got := findFreeName([]Node{{Name: longName}}, longName)

	if utf8.RuneCountInString(got) > maxNameLength || !strings.HasSuffix(got, "-2") {
		t.Errorf("long name = %d runes %q, want at most %d ending in -2", utf8.RuneCountInString(got), got, maxNameLength)
	}
}
