CREATE TABLE note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    source_note_id UUID NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_note_id, target_note_id)
);

CREATE INDEX idx_note_links_source_note_id ON note_links (source_note_id);

CREATE INDEX idx_note_links_target_note_id ON note_links (target_note_id);
