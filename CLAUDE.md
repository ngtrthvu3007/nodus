# CLAUDE.md

Rules for AI coding agents in this repository. Project overview, stack, and setup: [README.md](README.md). Product direction: [docs/BRD.md](docs/BRD.md). Stack decisions: [docs/adr/ADR-001-tech-stack.md](docs/adr/ADR-001-tech-stack.md).

## Context

- Nodus is a tool for writing linked technical docs (markdown, wiki-links, backlinks, sitemap, share/publish, MCP).
- The codebase is migrating per ADR-001: `go-nodus` moves Fiber → Gin and adds swaggo + golang-migrate; the new frontend `next-nodus` (Next.js + antd v6 + Tailwind v4) replaces `web-nodus`.
- `web-nodus` is maintenance-only: no new features; fix only data-loss bugs when asked.
- Product docs under `docs/` are in Vietnamese. README, CLAUDE.md, code, identifiers, and commit messages are in English.

## Working Mode

- Implement scoped changes when asked; advise or review when asked for advice or review.
- If requirements are unclear, ask one concise question before editing.
- Start from the files, logs, screenshots, or test names the user provides; otherwise search for the smallest relevant area. Do not scan the whole repository by default.
- Read a file before editing it.
- Keep changes focused on the task. Do not edit unrelated files or broad-refactor without approval.
- Prefer existing patterns, helpers, services, components, and hooks before adding new abstractions.

## Commands

- Agents may run:
  - Formatting and static checks: `gofmt -l`, `gofmt -w` (only on files the agent changed), `go vet ./...`.
  - Read-only inspection: `rg`, `git status`, `git diff`, `git log`, `git show`, `git diff --check`.
- The user runs:
  - Package installs, removals, and updates.
  - Any git command that changes state (`add`, `commit`, `push`, `pull`, `checkout`, `switch`, `branch`, `merge`, `rebase`, `reset`, `stash`, `tag`).
  - Builds, dev servers, tests, migrations, and code generation (`sqlc`, `swag`, `orval`).
- When verification is needed, print the exact command for the user to run. Never claim something passed without visible output.
- Dependency installs follow the organization's package rules (avoid versions published within the last 7 days).

## Approval Gates

Ask before:

- Changing API contracts (request/response shapes, status codes, routes).
- Changing DB schema or migrations.
- Touching auth, permissions, payments, or secrets.
- Changing deployment, CI, or infrastructure.
- Adding, removing, or upgrading dependencies.
- Editing generated files.
- Broad architecture changes or refactors.
- Deleting or renaming files, or removing large code blocks.
- Changing decisions recorded in BRD, ADR, or FRD documents.

## Backend (`go-nodus`)

- Each domain is one package under `internal/` with fixed layers: routes → handler → service → repository. See [docs/backend-map.md](docs/backend-map.md).
- Handlers are thin: bind and validate the request DTO (Gin `binding` tags), call the service, write the response. No business logic in handlers.
- Services own business rules and return domain errors (`apperr`), never HTTP types.
- Repositories own queries and convert sqlc `pgtype.*` to domain types; `pgtype` must not leak out of the repository.
- Map errors to HTTP in one place (`httpx`). Never return raw DB or internal error messages to clients; log them with `slog` and the request context.
- Pass `context.Context` through every layer. Wrap multi-step writes in one transaction.
- Every HTTP handler has swaggo annotations that match its route, params, and responses. The user regenerates the docs.
- Keep code `gofmt`-clean. Do not panic in the request path.

### sqlc

- Queries live in `internal/db/queries/*.sql`. Never edit generated code in `internal/db/*.go`; ask the user to regenerate.
- Every query on a soft-deleted table filters `deleted_at IS NULL`.
- Every query on a user-owned table takes and filters `user_id` (once accounts exist).
- Escape `%` and `_` in user input used with `LIKE`/`ILIKE`.

### Database Migrations

- The schema lives in SQL migrations under `go-nodus/migrations` (golang-migrate format). sqlc reads them as its schema.
- Never use auto-migration to change the schema.
- After a schema change is approved, agents may create files with `make migrate-create NAME=<name>` (golang-migrate CLI) and draft the `up`/`down` SQL.
- Never edit or delete a migration that has already been applied; add a new one.
- Required order (user runs): review SQL → `make sqlc` → `go vet ./...` → `make migrate-up`.
- Do not claim generate or migrate succeeded unless the user provides output.

## Frontend

### TypeScript

- Assume `strict` and `strictNullChecks`. Prefer `unknown` over `any`.
- Rely on inference for simple returns; add explicit return types for exported functions, module boundaries, and complex objects or unions.
- Avoid type assertions without a clear reason. No `@ts-ignore` without justification.
- `interface` for object shapes and exported contracts; `type` for unions, mapped and utility types, and composition. Use `type` when a value must be assignable to an index-signature type such as `Record<string, unknown>`.
- String literal unions or `as const` objects instead of enums.
- Handle null/undefined with optional chaining, type guards, or explicit checks.

### Style

- `const` by default, `let` only when reassigned, never `var`. Use destructuring and template literals where they read better.
- Prefer `map`, `filter`, `reduce`, `flatMap`, `Object.entries` over loops; use loops only for early exit, async sequencing, streaming, or hot paths.
- Never mutate function inputs, shared state, React state or props, or query cache data.
- Use `Boolean(array.length)` for explicit boolean conversion.
- Use arrow functions for components, functions, and handlers.

### `next-nodus`

- `next-nodus` runs Next.js 16, whose APIs may differ from what you know: read the relevant guide in `next-nodus/node_modules/next/dist/docs/` before writing Next.js code (see `next-nodus/AGENTS.md`). Use `pnpm`.
- Workspace screens are client components. All data goes through the Go API; do not put business logic in Server Actions or route handlers.
- Server state uses TanStack Query through the orval-generated client. Never edit generated client code. Invalidate every affected query after a mutation (tree, breadcrumbs, lists).
- Use antd components first; use Tailwind for layout, spacing, and overrides. Style inner parts through antd v6 semantic `classNames`/`styles`.
- Colors, radius, fonts, and spacing come only from the shared tokens (`shared/theme/tokens.ts`, exposed to Tailwind as `bg-primary`, `text-fg-muted`, `bg-surface`…); no hardcoded hex values or pixel font sizes — use `text-ui` for app chrome and `text-doc`, `text-h1`–`text-h3` for document content. After editing `shared/theme/tokens.ts`, run `pnpm tokens` to regenerate `shared/theme/tokens.css`.
- Use `!important` only where an antd inline style blocks an override, with a comment explaining why.
- Follow the design direction in ADR-001 §5 for new UI.

### UI Changes

- Do not change styling, layout, spacing, colors, or visual design unless the task requires it.
- Preserve existing component and design-system patterns.

## Code Organization

- One responsibility per file; small functions; split when a function becomes hard to scan.
- Prefer one object parameter with a named type over long parameter lists.
- Names are concise but descriptive. Use layer suffixes where they help (`Handler`, `Service`, `Repo`, `Dto`, `Mapper`, `Validator`) and follow existing file naming.
- Keep imports organized; remove unused imports, temporary logs, debug code, and commented-out code.
- Keep public exports intentional.

### Helpers

- Do not create a helper just to move one obvious line. Extract when logic repeats, transforms meaningfully, or improves readability.
- Check nearby utils before creating one. Keep helpers private unless reused.
- Use short, specific names: `map`, `get`, `to`, `build`, `parse`, `transform`.

## Docs

- `docs/BRD.md`: product direction. `docs/SPEC-vN.md`: scope summary per phase. `docs/frd/`: one feature per file. `docs/adr/`: architecture decisions. `docs/backend-map.md`: backend module map.
- `docs/archive/`: superseded docs, reference only. Do not treat them as requirements.
- FRDs specify what the system does, not how users might use it.
- Link docs with `[[wiki-link]]`. Update the relevant FRD when behavior changes.

## Verification

- After changes, inspect affected files and nearby call sites, then run `gofmt -l` and `go vet ./...` for backend changes.
- Give the smallest relevant verification command for anything the user runs (tests, builds, generation).
- Do not open Playwright or any browser automation to check changes unless the user asks for it in the current prompt.
- Do not suppress lint, type, build, or test failures without explaining why.
