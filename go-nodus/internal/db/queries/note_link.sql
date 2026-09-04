-- name: CreateNoteLink :one
INSERT INTO note_links (source_note_id, target_note_id)
VALUES ($1, $2)
ON CONFLICT (source_note_id, target_note_id) DO NOTHING
RETURNING *;

-- name: DeleteNoteLinksBySourceID :exec
DELETE FROM note_links WHERE source_note_id = $1;

-- name: FindBacklinksByNoteID :many
SELECT n.id, n.title, nl.created_at
FROM note_links nl
JOIN notes n ON n.id = nl.source_note_id
WHERE nl.target_note_id = $1 AND n.deleted_at IS NULL
ORDER BY nl.created_at DESC;

-- name: FindOutgoingLinksByNoteID :many
SELECT n.id, n.title, nl.created_at
FROM note_links nl
JOIN notes n ON n.id = nl.target_note_id
WHERE nl.source_note_id = $1 AND n.deleted_at IS NULL
ORDER BY nl.created_at DESC;

-- name: FindNoteIDByTitle :one
SELECT id FROM notes WHERE title = $1 AND deleted_at IS NULL;

-- name: FindNoteTitlesByPrefix :many
SELECT id, title
FROM notes
WHERE deleted_at IS NULL AND title ILIKE sqlc.arg (query)::text || '%'
ORDER BY title ASC
LIMIT 10;
