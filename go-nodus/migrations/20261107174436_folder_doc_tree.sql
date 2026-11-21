-- Create "workspaces" table
CREATE TABLE "public"."workspaces" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Modify "folders" table
ALTER TABLE "public"."folders" ADD COLUMN "workspace_id" uuid NOT NULL, ADD COLUMN "parent_folder_id" uuid NULL, ADD COLUMN "description" text NOT NULL DEFAULT '', ADD COLUMN "position" bigint NOT NULL, ADD CONSTRAINT "fk_folders_parent_folder" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."folders" ("id") ON UPDATE NO ACTION ON DELETE CASCADE, ADD CONSTRAINT "fk_folders_workspace" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;
-- Create index "idx_folders_position" to table: "folders"
CREATE INDEX "idx_folders_position" ON "public"."folders" ("workspace_id", "parent_folder_id", "position");
-- Create "docs" table
CREATE TABLE "public"."docs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "folder_id" uuid NULL,
  "parent_doc_id" uuid NULL,
  "title" text NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "position" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_docs_folder" FOREIGN KEY ("folder_id") REFERENCES "public"."folders" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "fk_docs_parent_doc" FOREIGN KEY ("parent_doc_id") REFERENCES "public"."docs" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "fk_docs_workspace" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_docs_deleted_at" to table: "docs"
CREATE INDEX "idx_docs_deleted_at" ON "public"."docs" ("deleted_at");
-- Create index "idx_docs_folder_position" to table: "docs"
CREATE INDEX "idx_docs_folder_position" ON "public"."docs" ("workspace_id", "folder_id", "position");
-- Create index "idx_docs_parent_position" to table: "docs"
CREATE INDEX "idx_docs_parent_position" ON "public"."docs" ("workspace_id", "parent_doc_id", "position");
-- Create "doc_links" table
CREATE TABLE "public"."doc_links" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "source_doc_id" uuid NOT NULL,
  "target_doc_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_doc_links_source_doc" FOREIGN KEY ("source_doc_id") REFERENCES "public"."docs" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "fk_doc_links_target_doc" FOREIGN KEY ("target_doc_id") REFERENCES "public"."docs" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_doc_links_source_target" to table: "doc_links"
CREATE UNIQUE INDEX "idx_doc_links_source_target" ON "public"."doc_links" ("source_doc_id", "target_doc_id");
-- Create index "idx_doc_links_target_doc_id" to table: "doc_links"
CREATE INDEX "idx_doc_links_target_doc_id" ON "public"."doc_links" ("target_doc_id");
-- Drop "note_links" table
DROP TABLE "public"."note_links";
-- Drop "notes" table
DROP TABLE "public"."notes";
-- Unique folder name per parent, case-insensitive (hand-written: GORM tags cannot express expressions).
-- A root folder (parent_folder_id NULL) is mapped to the zero uuid so roots collide with each other too.
CREATE UNIQUE INDEX "folders_unique_name" ON "public"."folders" ("workspace_id", coalesce("parent_folder_id", '00000000-0000-0000-0000-000000000000'::uuid), lower("name"));
-- A doc sits in a folder or in another doc, never both (hand-written).
ALTER TABLE "public"."docs" ADD CONSTRAINT "docs_one_parent" CHECK ("folder_id" IS NULL OR "parent_doc_id" IS NULL);
-- Unique doc title per parent among live docs, case-insensitive (hand-written).
CREATE UNIQUE INDEX "docs_unique_title" ON "public"."docs" ("workspace_id", coalesce("folder_id", '00000000-0000-0000-0000-000000000000'::uuid), coalesce("parent_doc_id", '00000000-0000-0000-0000-000000000000'::uuid), lower("title")) WHERE "deleted_at" IS NULL;
-- Default workspace until accounts exist (NOD-36). Fixed id so the frontend can reference it.
INSERT INTO "public"."workspaces" ("id", "name") VALUES ('00000000-0000-0000-0000-000000000001', 'Default');
