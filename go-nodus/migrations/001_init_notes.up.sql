create extension if not exists pgcrypto;

create table notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_notes_deleted_at ON notes (deleted_at);

CREATE INDEX idx_notes_updated_at ON notes (updated_at DESC);