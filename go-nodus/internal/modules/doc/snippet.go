package doc

import (
	"regexp"
	"strings"
	"unicode"
)

const (
	snippetLength = 160
	snippetLead   = 60
)

var (
	fenceLine   = regexp.MustCompile("(?m)^\\s*(```|~~~).*$")
	blockMarker = regexp.MustCompile(`(?m)^\s*(#{1,6}|>|[-*+])\s+`)
	wikiLink    = regexp.MustCompile(`\[\[([^\]]+)\]\]`)
)

// About 160 characters around the first match; the start of the content when there is none.
// ponytail: cuts before cleaning markdown, so a code fence may be cut in half.
func buildSnippet(content string, keyword string) string {
	runes := []rune(content)

	start := 0
	if match := indexFold(runes, []rune(keyword)); match >= 0 {
		start = max(0, match-snippetLead)
	}

	end := min(len(runes), start+snippetLength)
	text := cleanMarkdown(string(runes[start:end]))

	if start > 0 {
		text = "…" + text
	}

	if end < len(runes) {
		text += "…"
	}

	return text
}

// Matches by rune, so the offset stays valid for Vietnamese text; -1 when not found.
func indexFold(text []rune, needle []rune) int {
	for index := 0; len(needle) > 0 && index+len(needle) <= len(text); index++ {
		if equalFold(text[index:index+len(needle)], needle) {
			return index
		}
	}

	return -1
}

func equalFold(left []rune, right []rune) bool {
	for index := range left {
		if unicode.ToLower(left[index]) != unicode.ToLower(right[index]) {
			return false
		}
	}

	return true
}

func cleanMarkdown(text string) string {
	text = fenceLine.ReplaceAllString(text, "")
	text = blockMarker.ReplaceAllString(text, "")
	text = wikiLink.ReplaceAllString(text, "$1")

	return strings.Join(strings.Fields(text), " ")
}
