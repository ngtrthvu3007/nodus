# Atlas runs in docker compose (service `atlas`); URLs come from its environment.
# Use the Makefile targets: they export the GORM schema first, then call Atlas.

env "local" {
  # Desired schema: internal/db/models.go exported to SQL by atlas-provider-gorm (`make migrate-diff`).
  src = "file://.atlas/schema.sql"
  url = getenv("ATLAS_DB_URL")
  dev = getenv("ATLAS_DEV_URL")

  migration {
    dir = "file://migrations"
  }
}
