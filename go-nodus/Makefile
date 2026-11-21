# Everything runs through Go (`go tool`) or Docker — nothing else to install.
# Atlas runs as the `atlas-migrate-runner` service (docker-compose.yml, profile "tools"); config in atlas.hcl.
# No Atlas container keeps running: the runner is removed after each command (`run --rm`), and the scratch
# database `atlas-dev-db` exists only while a diff or a rollback runs.

COMPOSE := docker compose --profile tools
ATLAS := $(COMPOSE) run --rm atlas-migrate-runner migrate --env local
N ?= 1

# Runs an Atlas command that needs the scratch database, then removes it — also when the command fails.
define with_dev_db
	$(COMPOSE) up -d --wait atlas-dev-db
	$(1); status=$$?; $(COMPOSE) rm -sf atlas-dev-db >/dev/null 2>&1; exit $$status
endef

.PHONY: dev schema swagger migrate-diff migrate-up migrate-status migrate-hash migrate-down-plan migrate-down migrate-clean

# API with hot reload (Air, config in .air.toml).
dev:
	go tool air

# Export internal/db/models.go as SQL for Atlas (desired schema), plus what GORM tags cannot express.
schema:
	@mkdir -p .atlas
	go tool atlas-provider-gorm load --path ./internal/db --dialect postgres > .atlas/schema.sql
	cat internal/db/extra_schema.sql >> .atlas/schema.sql

# Generate the Swagger docs (internal/apidocs) from the handler annotations. Served at /swagger/index.html.
swagger:
	go tool swag init -g cmd/api/main.go -o internal/apidocs --packageName apidocs --parseInternal

# Generate the next migration from the GORM models: make migrate-diff NAME=add_note_position
migrate-diff: schema
	$(call with_dev_db,$(ATLAS) diff $(NAME))

# Apply pending migrations.
migrate-up:
	$(ATLAS) apply

migrate-status:
	$(ATLAS) status

# Recompute migrations/atlas.sum after editing a generated migration by hand.
migrate-hash:
	$(ATLAS) hash

# Show the SQL that would revert the last N applied migrations, without running it: make migrate-down-plan N=1
migrate-down-plan:
	$(call with_dev_db,$(ATLAS) down $(N) --dry-run)

# Revert the last N applied migrations (default 1). Atlas refuses to drop tables or columns that hold data.
migrate-down:
	$(call with_dev_db,$(ATLAS) down $(N))

# Remove Atlas containers left behind by an interrupted command.
migrate-clean:
	$(COMPOSE) rm -sf atlas-dev-db atlas-migrate-runner
