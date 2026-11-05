# Every tool is pinned in go.mod (tool directives or cmd/migrate), so the team only needs Go, Docker and make.

MIGRATE := go run ./cmd/migrate
N ?= 1

.PHONY: dev sqlc swag migrate-up migrate-down migrate-create migrate-version migrate-force

# API with hot reload (Air, config in .air.toml).
dev:
	go tool air

# Regenerate internal/db from migrations (schema) and internal/db/queries.
sqlc:
	go tool sqlc generate

# Regenerate Swagger docs from handler annotations.
swag:
	go tool swag fmt
	go tool swag init -g cmd/main.go -o internal/apidocs --parseInternal

migrate-up:
	$(MIGRATE) up

# Roll back N migrations (default 1): make migrate-down N=2
migrate-down:
	$(MIGRATE) down $(N)

# New numbered pair 00N_<name>.up.sql / .down.sql: make migrate-create NAME=add_note_position
migrate-create:
	$(MIGRATE) create $(NAME)

migrate-version:
	$(MIGRATE) version

# Mark the DB as version V without running SQL (e.g. a DB migrated by hand): make migrate-force V=3
migrate-force:
	$(MIGRATE) force $(V)
