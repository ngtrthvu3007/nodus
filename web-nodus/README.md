# web-nodus (deprecated)

Current Nuxt frontend. **Maintenance only** — it will be replaced by `next-nodus` (Next.js + antd v6 + Tailwind v4) per [ADR-001](../docs/adr/ADR-001-tech-stack.md) and removed in phase 3 of that ADR.

- No new features. Fix only data-loss bugs when needed.
- Setup: see [Getting Started](../README.md#getting-started) in the root README.
- Useful references when building `next-nodus`: color tokens (`app/global.css`), wiki-link rendering (`app/components/editor/markdown-preview.vue`), CodeMirror setup with `[[` autocomplete (`app/components/editor/code-mirror.vue`), tree building (`app/composables/useNoteTree.ts`).
