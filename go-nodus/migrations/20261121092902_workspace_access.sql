-- Modify "docs" table
ALTER TABLE "public"."docs" DROP CONSTRAINT "fk_docs_workspace", ADD CONSTRAINT "fk_docs_workspace" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Modify "folders" table
ALTER TABLE "public"."folders" DROP CONSTRAINT "fk_folders_workspace", ADD CONSTRAINT "fk_folders_workspace" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Demo workspace seeded before accounts existed (ADR-002): its folders, docs and links go with it.
DELETE FROM "public"."workspaces" WHERE "id" = '00000000-0000-0000-0000-000000000001';
