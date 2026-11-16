package export

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

const (
	markdownExtension = ".md"
	zipExtension      = ".zip"

	maxFileNameLength    = 100
	forbiddenFileChars   = `\:*?"<>|`
	minPrefixWidth       = 2
	firstDuplicateNumber = 2
	fallbackDownloadName = "export"
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

var dWithStroke = strings.NewReplacer("đ", "d", "Đ", "D")

// toDownloadName is the name of the downloaded file: lowercase, no accents, words joined by "-" ("Tổng quan" becomes
// "tong-quan"). The files inside a zip keep their readable names (toFileName).
func toDownloadName(name string) string {
	// đ has no decomposition, so it is replaced first; the rest splits into a letter and its accent marks.
	decomposed := norm.NFD.String(dWithStroke.Replace(name))

	var slug strings.Builder
	isWordBreak := false

	for _, char := range decomposed {
		switch {
		case unicode.Is(unicode.Mn, char):
			continue
		case unicode.IsLetter(char) || unicode.IsDigit(char):
			if isWordBreak && slug.Len() > 0 {
				slug.WriteByte('-')
			}

			isWordBreak = false
			slug.WriteRune(unicode.ToLower(char))
		default:
			isWordBreak = true
		}
	}

	if slug.Len() == 0 {
		return fallbackDownloadName
	}

	// Cutting a long name can leave it ending in "-".
	return strings.TrimRight(toFileName(slug.String()), "-")
}

// getPrefixWidth is 2 digits, or 3 when a directory holds 100 or more items, so names still sort in tree order.
func getPrefixWidth(count int) int {
	return max(minPrefixWidth, len(strconv.Itoa(count)))
}

func toPrefixedName(number int, width int, name string) string {
	return fmt.Sprintf("%0*d-%s", width, number, toFileName(name))
}

// getUniqueName returns a name that does not clash with the ones already in used, and records it. The comparison
// ignores case because Windows and macOS file systems do.
func getUniqueName(used map[string]bool, base string, extension string) string {
	name := base + extension

	for number := firstDuplicateNumber; used[strings.ToLower(name)]; number++ {
		name = base + "-" + strconv.Itoa(number) + extension
	}

	used[strings.ToLower(name)] = true

	return name
}
