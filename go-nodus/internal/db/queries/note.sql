-- name: FindNotes :many
SELECT *
FROM notes
WHERE
    deleted_at IS NULL
    AND (
        sqlc.arg (query)::text = ''
        OR title ILIKE '%' || sqlc.arg (query)::text || '%'
    )
ORDER BY updated_at DESC;

-- name: FindNoteByID :one
SELECT * FROM notes WHERE id = $1 AND deleted_at IS NULL;

-- name: FindNotesByFolderID :many
SELECT *
FROM notes
WHERE
    folder_id = $1
    AND parent_note_id IS NULL
    AND deleted_at IS NULL;

-- name: CreateNote :one
INSERT INTO
    notes (
        title,
        content,
        folder_id,
        parent_note_id
    )
VALUES ($1, $2, $3, $4)
RETURNING
    *;

-- name: UpdateNote :one
UPDATE notes
SET
    title = $2,
    content = $3,
    updated_at = now()
WHERE
    id = $1
    AND deleted_at IS NULL
RETURNING
    *;

-- name: DeleteNote :one
UPDATE notes
SET
    updated_at = now(),
    deleted_at = now()
WHERE
    id = $1
    AND deleted_at IS NULL
RETURNING
    *;

-- name: NoteHasChildren :one
SELECT EXISTS(
    SELECT 1 FROM notes WHERE parent_note_id = $1 AND deleted_at IS NULL
);

-- name: FindParentNoteIDsWithChildren :many
SELECT DISTINCT parent_note_id
FROM notes
WHERE parent_note_id IS NOT NULL AND deleted_at IS NULL;

-- name: MoveNote :one
UPDATE notes
SET
    folder_id = $2,
    parent_note_id = $3,
    updated_at = now()
WHERE
    id = $1
    AND deleted_at is NULL
RETURNING
    *;

-- name: CountNotesByFolder :many
SELECT folder_id, COUNT(*) AS note_count
FROM notes
WHERE folder_id IS NOT NULL AND deleted_at IS NULL
GROUP BY folder_id;