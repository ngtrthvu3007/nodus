-- Runs once when the Atlas scratch database starts (see docker-compose.yml).
-- Free Atlas cannot declare an extension in the schema, so it is installed here: the trigram indexes
-- in internal/db/extra_schema.sql need `gin_trgm_ops` to exist when Atlas loads that schema.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
