# go-nodus

## Getting Started

```bash
go run ./cmd/main.go
```

Or with hot-reload via [air](https://github.com/air-verse/air) (config in `.air.toml`):

```bash
air
```

If `air: command not found`, install it and make sure `$GOPATH/bin` is on your `$PATH`:

```bash
go install github.com/air-verse/air@latest
export PATH="$PATH:$(go env GOPATH)/bin"  # add to ~/.zshrc to persist
```

Or build a binary:

```bash
go build -o bin/go-nodus ./cmd
./bin/go-nodus
```

Requires a `.env` file (loaded via `godotenv`) with at least `DATABASE_URL` and `PORT`.

## Tech Stack

- **Go 1.26**
- **Fiber** (`gofiber/fiber/v2`) — HTTP framework
- **pgx/v5** — PostgreSQL driver (`pgxpool` for connection pooling)
- **sqlc** — generates type-safe Go code from raw SQL queries (`internal/db`)
- **godotenv** — loads `.env` for local config

## Migrations

No migration tool — plain `.sql` files applied directly via `psql`. Files live in `migrations/`, following a `NNN_description.up.sql` / `.down.sql` naming pattern (increment the number):

```bash
migrations/
  001_init_notes.up.sql
  001_init_notes.down.sql
```

Create the `.up.sql` / `.down.sql` files by hand and write the SQL (DDL: `CREATE TABLE`, `ALTER TABLE`, etc.) by hand too — no codegen tool involved.

Apply a migration file to the running `postgres` container (started via `docker compose`):

```bash
make migrate-apply FILE=001_init_notes.up.sql
```

To roll back, apply the corresponding `.down.sql` file the same way.

**Never edit an already-applied migration file. Add a new one instead.**

## sqlc

SQL queries live in `internal/<module>/queries/*.sql` and are compiled into type-safe Go code under `internal/db` via [sqlc](https://sqlc.dev).

Regenerate after adding or changing a query:

```bash
make sqlc-generate
```

Generated files (`internal/db/*.go`) are marked `DO NOT EDIT` — never edit them by hand.
