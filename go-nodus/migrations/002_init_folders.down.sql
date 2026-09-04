DROP INDEX IF EXISTS idx_notes_parent_note_id;

DROP INDEX IF EXISTS idx_notes_folder_id;

ALTER TABLE notes
    DROP COLUMN IF EXISTS parent_note_id,
    DROP COLUMN IF EXISTS folder_id;

DROP TABLE IF EXISTS folders;
