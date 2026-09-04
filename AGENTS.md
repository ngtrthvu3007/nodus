# AGENTS.md

## Purpose

Shared operating rules for AI coding agents working in this repository.

Codex reads this file directly.
Claude Code should import this file from `CLAUDE.md`.

## Operating Mode

- Implement scoped changes when requested; advise or review when the user asks for advice/review.
- Keep changes focused on the current task.
- Prefer existing project patterns, helpers, services, components, hooks, and utilities before introducing new abstractions.
- If requirements are unclear, ask one concise question before editing.
- If files/logs/screenshots/test names are provided, start from those.
- If no relevant context is provided, use fast search to find the smallest relevant area.
- Read a file before editing it.
- Do not scan the whole repository by default.
- Do not edit unrelated files or broad-refactor without approval.

## CLI Commands

- The user runs install, build, dev server, lint, typecheck, tests, migrations, and dependency updates.
- Agents may run read-only inspection commands such as `rg`, `sed`, `git diff`, `git status`, and `git diff --check`.
- When verification is needed, print the exact command for the user to run and do not claim it passed without visible output.

## Architecture

- Base implementation decisions on the current project structure before creating new layers or conventions.
- Validate and transform request inputs at system boundaries, preferably middleware/DTO.
- Controllers should be thin: destructure validated request data, call service, return result.
- Services own business logic.
- Repositories own persistence queries.
- Preserve existing API request/response shapes unless a contract change is approved.
- Use consistent error handling with the existing project style.
- Keep public exports intentional.
- Name exported service/repository functions with clear suffixes or prefixes when ambiguity is likely.

## Approval Gates

Ask before changing API contracts, DB schema/migrations, auth/permissions, payments/secrets, deployment/CI/infra, dependencies, generated files, broad architecture, or deleting files/large code blocks.

## Database Migrations

- Absolutely never create, edit, or delete Prisma migration files by hand.
- For schema changes, agents may edit `schema.prisma` only after approval, then tell the user to run Prisma migration commands.
- Required order: `npx prisma migrate dev --create-only --name <migration_name>`, review generated SQL, `npm run prisma:generate`, `npm run typecheck`, then `npm run prisma:migrate`.
- Do not claim a migration, generate, or typecheck succeeded unless the user provides output.

## Code Organization

- Keep imports organized and remove unused imports.
- Use the project formatter/linter style.
- Remove temporary logs, debug code, and commented-out code.
- Keep files focused on one responsibility.
- Keep functions small and readable; split when a function becomes hard to scan.
- Avoid long parameter lists; prefer a single object parameter with a named interface/type.
- Keep function and variable names concise but descriptive; avoid names that are too long or vague.
- Use clear function suffixes that match the layer or purpose when helpful, such as `Controller`, `Service`, `Repo`, `Dto`, `Handler`, `Mapper`, or `Validator`.
- Follow existing file naming and suffix conventions.

## TypeScript

- Assume `strict` and `strictNullChecks`.
- Prefer TypeScript inference for simple return types such as `string`, `number`, `boolean`, `void`, and obvious local expressions.
- Add explicit return types when the function is exported, crosses a module boundary, returns a complex object/union, or inference makes the contract hard to read.
- Prefer `unknown` over `any`.
- Avoid type assertions unless there is a clear reason.
- Do not use `@ts-ignore` without justification.
- Prefer `interface` for object shapes and exported contracts.
- Use `type` for unions, mapped types, utility types, and composition.
- Use string literal unions or `as const` objects instead of enums unless runtime enum behavior is useful.
- Handle null/undefined with optional chaining, type guards, or explicit checks.

## JavaScript / TypeScript Style

- Use modern ES6+ syntax.
- Prefer `const`; use `let` only when reassignment is needed.
- Do not use `var`.
- Prefer destructuring when it improves readability.
- Prefer template literals for interpolation.
- Do not use `for`, `for...of`, or `for...in` for most collection work; prefer `map`, `filter`, `reduce`, `flatMap`, `Object.entries`, or object/array transforms.
- Use loops only when they are clearly simpler for early exit, async sequencing, streaming, or performance-sensitive code.
- Do not mutate function inputs, shared state, React state/props, query cache data, or Redux/Zustand state directly.
- Avoid mutating reducers; return a new accumulator unless performance/readability clearly favors a local mutable structure.
- Use `Boolean(array.length)` for explicit boolean conversion.

## Helpers

- Do not create helpers just to move one obvious line.
- Extract helpers when logic repeats, has meaningful transformation, or improves readability.
- Check nearby utils/helpers before creating a new one.
- Keep helpers private unless reused outside the module.
- Use short, specific helper names such as `map`, `get`, `to`, `build`, `parse`, or `transform`.

## UI

- Do not change styling, CSS classes, layout, spacing, colors, or visual design unless the task requires it.
- Preserve existing component and design-system patterns.
- Use arrow functions for frontend functions and handlers.

## Verification

- Inspect affected files and nearby call sites after changes.
- Identify the smallest relevant verification command.
- Ask the user to run backend tests/typecheck when backend behavior changes.
- Do not suppress lint, type, build, or test failures without explaining why.
