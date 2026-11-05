-- Create "folders" table
CREATE TABLE "public"."folders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id"));
-- Create "notes" table
CREATE TABLE "public"."notes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" text NOT NULL, "content" text NOT NULL DEFAULT '', "folder_id" uuid NULL, "parent_note_id" uuid NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz NULL, PRIMARY KEY ("id"), CONSTRAINT "fk_notes_folder" FOREIGN KEY ("folder_id") REFERENCES "public"."folders" ("id") ON UPDATE NO ACTION ON DELETE CASCADE, CONSTRAINT "fk_notes_parent_note" FOREIGN KEY ("parent_note_id") REFERENCES "public"."notes" ("id") ON UPDATE NO ACTION ON DELETE CASCADE);
-- Create index "idx_notes_deleted_at" to table: "notes"
CREATE INDEX "idx_notes_deleted_at" ON "public"."notes" ("deleted_at");
-- Create index "idx_notes_folder_id" to table: "notes"
CREATE INDEX "idx_notes_folder_id" ON "public"."notes" ("folder_id");
-- Create index "idx_notes_parent_note_id" to table: "notes"
CREATE INDEX "idx_notes_parent_note_id" ON "public"."notes" ("parent_note_id");
-- Create index "idx_notes_updated_at" to table: "notes"
CREATE INDEX "idx_notes_updated_at" ON "public"."notes" ("updated_at" DESC);
-- Create "note_links" table
CREATE TABLE "public"."note_links" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "source_note_id" uuid NOT NULL, "target_note_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id"), CONSTRAINT "fk_note_links_source_note" FOREIGN KEY ("source_note_id") REFERENCES "public"."notes" ("id") ON UPDATE NO ACTION ON DELETE CASCADE, CONSTRAINT "fk_note_links_target_note" FOREIGN KEY ("target_note_id") REFERENCES "public"."notes" ("id") ON UPDATE NO ACTION ON DELETE CASCADE);
-- Create index "idx_note_links_source_target" to table: "note_links"
CREATE UNIQUE INDEX "idx_note_links_source_target" ON "public"."note_links" ("source_note_id", "target_note_id");
-- Create index "idx_note_links_target_note_id" to table: "note_links"
CREATE INDEX "idx_note_links_target_note_id" ON "public"."note_links" ("target_note_id");
