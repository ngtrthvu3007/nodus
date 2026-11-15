package doc

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"go-nodus/internal/db"
)

// Walks up from the docs of one result page only (the tree is at most 4 levels deep),
// so the cost does not grow with the workspace.
const pathQuery = `
WITH RECURSIVE chain AS (
	SELECT id AS doc_id, COALESCE(folder_id, parent_doc_id) AS node_id, 1 AS depth
	FROM docs
	WHERE id IN ?
	UNION ALL
	SELECT chain.doc_id, parent.parent_id, chain.depth + 1
	FROM chain
	JOIN (
		SELECT id, parent_folder_id AS parent_id FROM folders
		UNION ALL
		SELECT id, COALESCE(folder_id, parent_doc_id) FROM docs WHERE deleted_at IS NULL
	) parent ON parent.id = chain.node_id
	WHERE chain.depth < 4
)
SELECT chain.doc_id, string_agg(COALESCE(folders.name, docs.title), ' / ' ORDER BY chain.depth DESC) AS path
FROM chain
LEFT JOIN folders ON folders.id = chain.node_id
LEFT JOIN docs ON docs.id = chain.node_id AND docs.deleted_at IS NULL
WHERE chain.node_id IS NOT NULL
GROUP BY chain.doc_id`

type pathRow struct {
	DocID uuid.UUID
	Path  string
}

// Returns doc id -> "Project / Backend"; a doc at the root has no entry.
func loadPaths(database *gorm.DB, docs []db.Doc) (map[uuid.UUID]string, error) {
	if len(docs) == 0 {
		return nil, nil
	}

	ids := make([]uuid.UUID, 0, len(docs))
	for _, doc := range docs {
		ids = append(ids, doc.ID)
	}

	var rows []pathRow
	if err := database.Raw(pathQuery, ids).Scan(&rows).Error; err != nil {
		return nil, err
	}

	paths := make(map[uuid.UUID]string, len(rows))
	for _, row := range rows {
		paths[row.DocID] = row.Path
	}

	return paths, nil
}
