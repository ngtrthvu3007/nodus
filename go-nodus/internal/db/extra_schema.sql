-- Schema that GORM tags cannot express. `make schema` appends this file to the exported models so Atlas
-- does not try to drop these objects. Keep it in sync with the hand-written part of the migrations.

-- Unique folder name per parent, case-insensitive. A root folder (parent_folder_id NULL) maps to the zero uuid.
CREATE UNIQUE INDEX "folders_unique_name" ON "public"."folders" ("workspace_id", coalesce("parent_folder_id", '00000000-0000-0000-0000-000000000000'::uuid), lower("name"));

-- A doc sits in a folder or in another doc, never both.
ALTER TABLE "public"."docs" ADD CONSTRAINT "docs_one_parent" CHECK ("folder_id" IS NULL OR "parent_doc_id" IS NULL);

-- Unique doc title per parent among live docs, case-insensitive.
CREATE UNIQUE INDEX "docs_unique_title" ON "public"."docs" ("workspace_id", coalesce("folder_id", '00000000-0000-0000-0000-000000000000'::uuid), coalesce("parent_doc_id", '00000000-0000-0000-0000-000000000000'::uuid), lower("title")) WHERE "deleted_at" IS NULL;

-- One link per source doc and target ref, case-insensitive.
CREATE UNIQUE INDEX "doc_links_unique_ref" ON "public"."doc_links" ("source_doc_id", lower("target_ref"));
