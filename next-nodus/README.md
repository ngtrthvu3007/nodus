# next-nodus

New Nodus frontend: Next.js 16 + antd v6 + Tailwind CSS v4 + TanStack Query. Replaces `web-nodus` per [ADR-001](../docs/adr/ADR-001-tech-stack.md).

## Run

```bash
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:4000
```

The Go API must allow this origin: `ALLOWED_ORIGIN=http://localhost:4000` in `go-nodus/.env`. No Go installed? Run the API with Docker instead: `docker compose --profile app up -d --build` in `go-nodus` (see its README).

## Commands

- `pnpm dev` — dev server on port 4000.
- `pnpm lint` — ESLint.
- `pnpm build` — production build.
- `pnpm tokens` — regenerate `shared/theme/tokens.css` after changing `shared/theme/tokens.ts`.

## Theme

- `shared/theme/tokens.ts` is the single source of design tokens (Slate & Blue, light + dark).
- `pnpm tokens` (`shared/theme/buildTokens.mts`) regenerates `shared/theme/tokens.css`, which Tailwind maps to utilities such as `bg-primary`, `bg-surface`, `text-fg-muted`, `border-border`.
- CSS layer order in `app/globals.css`: `theme, base, antd, components, utilities` — Tailwind utilities override antd styles without `!important`.
- Theme mode lives in `data-theme` on `<html>` (`shared/theme/themeProvider.tsx`, persisted in the `nodus-theme` cookie); `/tokens` shows every token and antd component in both modes.

## Structure

- `app/` routing only (pages, layout, providers, `globals.css`); screens live in `features/<name>/`.
- `features/<name>/`: the main view at the root (`docView.tsx`), extra component files in `components/`, hooks in `hooks/`; each folder exports through an `index.ts` barrel. A component file is 150 to 200 lines (max 250), so small sub-components stay in the file of the component that owns them.
- `api/`: one function per Go API route, built on `httpClient`; `shared/constants/routes.ts` declares every endpoint and page route.
- `shared/`: `components`, `constants` (`NODE_KIND`, routes, workspace), `hooks` (`useToast`), `libs` (`httpClient`), `stores` (zustand), `theme`, `types` (hand-written, match the API's Swagger UI).
- File names are camelCase (`docView.tsx`, `useTreeModel.ts`). Errors from the API show as toasts at the bottom right through `useToast`.
