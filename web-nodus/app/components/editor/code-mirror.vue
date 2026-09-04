<script setup lang="ts">
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  placeholder as placeholderExtension,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, completionKeymap, type CompletionSource } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";

import { MARKDOWN_ACCENT } from "~/constants/markdown-accent";
import { fetchTitleSuggestions } from "~/apis/notes";

// Gõ [[ chưa đóng ]] → gợi ý title note đã tồn tại. Chọn 1 gợi ý chèn "Title]]"
// (tự đóng ngoặc), giữ nguyên "[[" người dùng đã gõ.
const wikiLinkCompletionSource: CompletionSource = async (context) => {
  const match = context.matchBefore(/\[\[([^[\]]*)$/);
  if (!match) {
    return null;
  }

  const query = match.text.slice(2);
  const suggestions = await fetchTitleSuggestions(query);
  if (context.aborted) {
    return null;
  }

  return {
    from: match.from + 2,
    options: suggestions.map((suggestion) => ({
      label: suggestion.title,
      apply: `${suggestion.title}]]`,
    })),
  };
};

const props = defineProps<{ placeholder?: string }>();

const content = defineModel<string>({ default: "" });

const editorRoot = useTemplateRef("editorRoot");
let view: EditorView | undefined;

// Theme tham chiếu trực tiếp biến --ui-* của Nuxt UI (app/global.css) thay vì
// hardcode màu riêng, để tự động khớp light/dark theme của hệ thống.
const nuxtUiTheme = EditorView.theme({
  "&": { height: "100%", color: "var(--ui-text)", backgroundColor: "var(--ui-bg-muted)" },
  "&.cm-focused": { outline: "none" },
  ".cm-content": { caretColor: "var(--ui-text)", padding: "0.5rem 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--ui-text)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--ui-bg-accented)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--ui-bg-muted)",
    color: "var(--ui-text-dimmed)",
    border: "none",
    borderRight: "1px solid var(--ui-border)",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 0.75rem 0 0.5rem" },
  ".cm-activeLine": { backgroundColor: "var(--ui-bg-elevated)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--ui-bg-elevated)", color: "var(--ui-text)" },
  ".cm-placeholder": { color: "var(--ui-text-dimmed)" },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    backgroundColor: "var(--ui-bg-elevated)",
    border: "1px solid var(--ui-border)",
    borderRadius: "0.375rem",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete ul li": {
    color: "var(--ui-text)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--ui-bg-accented)",
    color: "var(--ui-text-highlighted)",
  },
  ".cm-completionLabel": { color: "inherit" },
  ".cm-completionMatchedText": { color: "var(--ui-primary)", textDecoration: "none" },
});

const markdownHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading, fontWeight: "bold", color: MARKDOWN_ACCENT.heading },
    { tag: tags.strong, fontWeight: "bold", color: MARKDOWN_ACCENT.bold },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.link, color: MARKDOWN_ACCENT.link, textDecoration: "underline" },
    { tag: tags.url, color: MARKDOWN_ACCENT.string },
    {
      tag: tags.monospace,
      color: MARKDOWN_ACCENT.string,
      fontFamily: "var(--font-mono, ui-monospace, monospace)",
    },
    { tag: tags.quote, color: MARKDOWN_ACCENT.comment, fontStyle: "italic" },
    { tag: tags.processingInstruction, color: MARKDOWN_ACCENT.keyword },
  ]),
);

onMounted(() => {
  if (!editorRoot.value) {
    return;
  }

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      content.value = update.state.doc.toString();
    }
  });

  view = new EditorView({
    parent: editorRoot.value,
    state: EditorState.create({
      doc: content.value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        markdown(),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        markdownHighlight,
        autocompletion({ override: [wikiLinkCompletionSource] }),
        placeholderExtension(props.placeholder ?? ""),
        updateListener,
        EditorView.lineWrapping,
        nuxtUiTheme,
      ],
    }),
  });
});

watch(content, (value) => {
  if (!view || value === view.state.doc.toString()) {
    return;
  }

  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
});

onBeforeUnmount(() => {
  view?.destroy();
});
</script>

<template>
  <div ref="editorRoot" class="h-full w-full overflow-auto font-mono text-sm" />
</template>
