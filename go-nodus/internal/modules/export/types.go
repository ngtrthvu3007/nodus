package export

import (
	"io"

	"github.com/google/uuid"
)

type exportDocsRequest struct {
	IDs []uuid.UUID `json:"ids" binding:"required,min=1,max=200"`
}

// exportFile is a download that is checked before the first byte: Write streams it into the response.
type exportFile struct {
	Name        string
	ContentType string
	Write       func(writer io.Writer) error
}

// entry is one path in a zip. A path ending in "/" is a directory; any other path holds the content of docID.
type entry struct {
	path  string
	docID uuid.UUID
}
