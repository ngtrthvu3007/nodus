# next-nodus

New Nodus frontend: Next.js 16 + antd v6 + Tailwind CSS v4 + TanStack Query. Replaces `web-nodus` per [ADR-001](../docs/adr/ADR-001-tech-stack.md).

## Run

```bash
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:4000
```

The Go API must allow this origin: `ALLOWED_ORIGIN=http://localhost:4000` in `go-nodus/.env`.

## Theme

- `shared/theme/tokens.ts` is the single source of design tokens (Slate & Blue, light + dark).
- `pnpm tokens` (`shared/theme/build-tokens.mts`) regenerates `shared/theme/tokens.css`, which Tailwind maps to utilities such as `bg-primary`, `bg-surface`, `text-fg-muted`, `border-border`.
- CSS layer order in `app/globals.css`: `theme, base, antd, components, utilities` — Tailwind utilities override antd styles without `!important`.
- Theme mode lives in `data-theme` on `<html>` (`shared/theme/theme-provider.tsx`, persisted in the `nodus-theme` cookie); `/tokens` shows every token and antd component in both modes.
