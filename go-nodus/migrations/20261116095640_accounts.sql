-- Create "users" table
CREATE TABLE "public"."users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "password_hash" text NULL,
  "email_verified_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_users_email" to table: "users"
CREATE UNIQUE INDEX "idx_users_email" ON "public"."users" ("email");
-- Create "personal_access_tokens" table
CREATE TABLE "public"."personal_access_tokens" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "token_hash" text NOT NULL,
  "scope" text NOT NULL,
  "last_used_at" timestamptz NULL,
  "revoked_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_personal_access_tokens_user" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "personal_access_tokens_scope" CHECK (scope = ANY (ARRAY['docs:read'::text, 'docs:write'::text]))
);
-- Create index "idx_personal_access_tokens_token_hash" to table: "personal_access_tokens"
CREATE UNIQUE INDEX "idx_personal_access_tokens_token_hash" ON "public"."personal_access_tokens" ("token_hash");
-- Create index "idx_personal_access_tokens_user_id" to table: "personal_access_tokens"
CREATE INDEX "idx_personal_access_tokens_user_id" ON "public"."personal_access_tokens" ("user_id");
-- Create "sessions" table
CREATE TABLE "public"."sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "user_agent" text NOT NULL DEFAULT '',
  "ip" text NOT NULL DEFAULT '',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_used_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_sessions_user" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_sessions_token_hash" to table: "sessions"
CREATE UNIQUE INDEX "idx_sessions_token_hash" ON "public"."sessions" ("token_hash");
-- Create index "idx_sessions_user_id" to table: "sessions"
CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" ("user_id");
-- Create "workspace_members" table
CREATE TABLE "public"."workspace_members" (
  "workspace_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("workspace_id", "user_id"),
  CONSTRAINT "fk_workspace_members_user" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "fk_workspace_members_workspace" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "workspace_members_role" CHECK (role = ANY (ARRAY['owner'::text, 'member'::text]))
);
-- Create index "idx_workspace_members_user_id" to table: "workspace_members"
CREATE INDEX "idx_workspace_members_user_id" ON "public"."workspace_members" ("user_id");
