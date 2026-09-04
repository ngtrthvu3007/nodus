-- name: FindFolders :many
SELECT * FROM folders ORDER BY name ASC;

-- name: FindFolderByID :one
SELECT * FROM folders WHERE id = $1;

-- name: CreateFolder :one
INSERT INTO folders (name) VALUES ($1) RETURNING *;

-- name: UpdateFolder :one
UPDATE folders SET name = $2, updated_at = now() WHERE id = $1 RETURNING *;

-- name: DeleteFolder :exec
DELETE FROM folders WHERE id = $1;
