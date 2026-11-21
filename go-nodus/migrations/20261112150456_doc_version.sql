-- Modify "docs" table
ALTER TABLE "public"."docs" ADD COLUMN "version" bigint NOT NULL DEFAULT 1;
