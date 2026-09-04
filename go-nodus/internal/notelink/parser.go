package notelink

import "regexp"

var wikiLinkPattern = regexp.MustCompile(`\[\[([^\[\]]+)\]\]`)

// ParseLinkedTitles extracts the titles referenced by [[Title]] wiki-links
// in content, in first-occurrence order with duplicates removed.
func ParseLinkedTitles(content string) []string {
	matches := wikiLinkPattern.FindAllStringSubmatch(content, -1)

	seen := make(map[string]bool, len(matches))
	titles := make([]string, 0, len(matches))
	for _, match := range matches {
		title := match[1]
		if seen[title] {
			continue
		}
		seen[title] = true
		titles = append(titles, title)
	}

	return titles
}
