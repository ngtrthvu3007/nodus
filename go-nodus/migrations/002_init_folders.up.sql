CREATE extension IF NOT EXISTS pgcrypto;

CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notes
    ADD COLUMN folder_id UUID REFERENCES folders (id) ON DELETE CASCADE,
    ADD COLUMN parent_note_id UUID REFERENCES notes (id) ON DELETE CASCADE;

CREATE INDEX idx_notes_folder_id ON notes (folder_id);

CREATE INDEX idx_notes_parent_note_id ON notes (parent_note_id);
