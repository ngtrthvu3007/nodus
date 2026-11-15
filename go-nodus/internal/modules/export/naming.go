package export

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

const (
	maxFileNameLength  = 100
	forbiddenFileChars = `\:*?"<>|`
)

// toFileName replaces the characters a file name cannot hold with "-" and cuts the name to 100 characters.
func toFileName(name string) string {
	replaced := strings.Map(func(char rune) rune {
		if strings.ContainsRune(forbiddenFileChars, char) || unicode.IsControl(char) {
			return '-'
		}

		return char
	}, name)

	runes := []rune(replaced)
	if len(runes) > maxFileNameLength {
		runes = runes[:maxFileNameLength]
	}

	return string(runes)
}

// getPrefixWidth is 2 digits, or 3 when a directory holds 100 or more items, so names still sort in tree order.
func getPrefixWidth(count int) int {
	return max(2, len(strconv.Itoa(count)))
}

func toPrefixedName(number int, width int, name string) string {
	return fmt.Sprintf("%0*d-%s", width, number, toFileName(name))
}

// takeName returns a name that does not clash with the ones already in used, and records it. The comparison ignores
// case because Windows and macOS file systems do.
func takeName(used map[string]bool, base string, extension string) string {
	name := base + extension

	for number := 2; used[strings.ToLower(name)]; number++ {
		name = base + "-" + strconv.Itoa(number) + extension
	}

	used[strings.ToLower(name)] = true

	return name
}
