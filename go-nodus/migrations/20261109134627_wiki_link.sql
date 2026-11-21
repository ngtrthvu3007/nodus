-- Drop old links (hand-written): target_ref is NOT NULL, and links are rebuilt on the next save.
DELETE FROM "public"."doc_links";
-- Drop index "idx_doc_links_source_target" from table: "doc_links"
DROP INDEX "public"."idx_doc_links_source_target";
-- Modify "doc_links" table
ALTER TABLE "public"."doc_links" DROP CONSTRAINT "fk_doc_links_target_doc", ALTER COLUMN "target_doc_id" DROP NOT NULL, ADD COLUMN "target_ref" text NOT NULL, ADD CONSTRAINT "fk_doc_links_target_doc" FOREIGN KEY ("target_doc_id") REFERENCES "public"."docs" ("id") ON UPDATE NO ACTION ON DELETE SET NULL;
-- Create index "doc_links_unique_ref" to table: "doc_links"
CREATE UNIQUE INDEX "doc_links_unique_ref" ON "public"."doc_links" ("source_doc_id", (lower(target_ref)));
