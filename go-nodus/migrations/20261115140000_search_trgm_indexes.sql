-- Hand-written: Atlas (free) cannot declare extensions or trigram indexes in the models, so atlas.hcl excludes them.
-- Substring search (ILIKE '%…%') on live docs; trigram indexes let Postgres skip a full scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Create index "docs_title_trgm" to table: "docs"
CREATE INDEX "docs_title_trgm" ON "public"."docs" USING gin ("title" gin_trgm_ops) WHERE "deleted_at" IS NULL;
-- Create index "docs_content_trgm" to table: "docs"
CREATE INDEX "docs_content_trgm" ON "public"."docs" USING gin ("content" gin_trgm_ops) WHERE "deleted_at" IS NULL;
