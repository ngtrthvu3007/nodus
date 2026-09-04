<script setup lang="ts">
import MarkdownIt from "markdown-it";
import type { default as Mermaid } from "mermaid";

import type { LinkedNote } from "~/types/note";
import { MARKDOWN_ACCENT } from "~/constants/markdown-accent";

// Template có 2 root node (div preview + UModal) nên Vue không tự inherit
// class truyền từ ngoài — tự nhận qua $attrs và gán tường minh vào div preview.
defineOptions({ inheritAttrs: false });

const ZOOM_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>';

const WIKI_LINK_PATTERN = /\[\[([^[\]]+)\]\]/;

interface MarkdownEnv {
  titleToId: Map<string, string>;
}

// mermaid là thư viện rất nặng (~1.4MB) — chỉ tải khi content thực sự có
// block ```mermaid, không bundle tĩnh vào mọi trang có preview.
let mermaidModule: typeof Mermaid | undefined;
const loadMermaid = async () => {
  if (!mermaidModule) {
    const { default: mermaid } = await import("mermaid");
    // Mermaid luôn vẽ trên nền sáng cố định (theme mặc định của nó), bất kể
    // app đang light/dark — .mermaid-block ép nền trắng riêng để chữ tương phản.
    mermaid.initialize({ startOnLoad: false, theme: "default" });
    mermaidModule = mermaid;
  }
  return mermaidModule;
};

type InlineRule = Parameters<InstanceType<typeof MarkdownIt>["inline"]["ruler"]["before"]>[2];

// Wiki-link [[Title]]: render thành link thật nếu titleToId (từ outgoing links
// đã resolve ở BE) có title đó, ngược lại render "broken link" — không tự tạo note.
const wikiLinkRule: InlineRule = (state, silent) => {
  if (state.src[state.pos] !== "[" || state.src[state.pos + 1] !== "[") {
    return false;
  }

  const match = WIKI_LINK_PATTERN.exec(state.src.slice(state.pos));
  const rawTitle = match?.[1];
  if (!match || match.index !== 0 || !rawTitle) {
    return false;
  }

  if (!silent) {
    const title = rawTitle.trim();
    const env = state.env as unknown as MarkdownEnv;
    const noteId = env.titleToId.get(title);

    const token = state.push("wiki_link", "", 0);
    token.meta = { title, noteId };
  }

  state.pos += match[0].length;
  return true;
};

const createMarkdownRenderer = () => {
  const md = new MarkdownIt({ html: false, linkify: true, breaks: false });
  const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules);

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (!token || token.info.trim() !== "mermaid") {
      return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
    }

    const escaped = md.utils.escapeHtml(token.content);
    return `<div class="mermaid-block" data-mermaid-source="${escaped}">${escaped}</div>`;
  };

  md.renderer.rules.wiki_link = (tokens, idx) => {
    const token = tokens[idx];
    if (!token) {
      return "";
    }

    const { title, noteId } = token.meta as { title: string; noteId?: string };
    const escapedTitle = md.utils.escapeHtml(title);

    if (!noteId) {
      return `<span class="wiki-link-broken" title="Note not found">${escapedTitle}</span>`;
    }

    return `<a href="/notes/${noteId}" class="wiki-link">${escapedTitle}</a>`;
  };

  md.inline.ruler.before("link", "wiki_link", wikiLinkRule);

  return md;
};

const addZoomButton = (block: HTMLElement, onZoom: () => void) => {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Zoom diagram");
  button.className = "mermaid-zoom-button";
  button.innerHTML = ZOOM_ICON_SVG;
  button.addEventListener("click", onZoom);

  block.style.position = "relative";
  block.append(button);
};

const props = defineProps<{ content: string; outgoingLinks: LinkedNote[] }>();

const md = createMarkdownRenderer();
const titleToId = computed(() => new Map(props.outgoingLinks.map((link) => [link.title, link.id])));
const renderedHtml = computed(() => md.render(props.content, { titleToId: titleToId.value } satisfies MarkdownEnv));
const previewRoot = useTemplateRef("previewRoot");

const zoomedSvg = ref<string | null>(null);
const isZoomOpen = computed({
  get: () => zoomedSvg.value !== null,
  set: (open: boolean) => {
    if (!open) {
      zoomedSvg.value = null;
    }
  },
});

const renderMermaidBlocks = async () => {
  await nextTick();
  const blocks = previewRoot.value?.querySelectorAll<HTMLElement>(".mermaid-block");
  if (!blocks || blocks.length === 0) {
    return;
  }

  const mermaid = await loadMermaid();

  for (const [index, block] of Array.from(blocks).entries()) {
    const source = block.dataset.mermaidSource;
    if (!source) {
      continue;
    }

    try {
      const { svg } = await mermaid.render(`mermaid-${Date.now()}-${index}`, source);
      block.innerHTML = svg;
      addZoomButton(block, () => {
        zoomedSvg.value = svg;
      });
    } catch {
      block.textContent = source;
    }
  }
};

watch(renderedHtml, renderMermaidBlocks, { immediate: true });
</script>

<template>
  <div ref="previewRoot" class="markdown-preview h-full w-full overflow-auto text-sm" v-bind="$attrs">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="renderedHtml" />
  </div>

  <UModal v-model:open="isZoomOpen" title="Diagram" :ui="{ content: 'max-w-4xl' }">
    <template #body>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="overflow-auto rounded-md bg-white p-4" v-html="zoomedSvg" />
    </template>
  </UModal>
</template>

<style scoped>
.markdown-preview {
  color: var(--ui-text);
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  font-weight: bold;
  color: v-bind("MARKDOWN_ACCENT.heading");
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.markdown-preview :deep(h1:first-child),
.markdown-preview :deep(h2:first-child),
.markdown-preview :deep(h3:first-child),
.markdown-preview :deep(h4:first-child),
.markdown-preview :deep(h5:first-child),
.markdown-preview :deep(h6:first-child) {
  margin-top: 0;
}

.markdown-preview :deep(p) {
  margin-top: 0;
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  margin-top: 0;
  margin-bottom: 0.75rem;
  padding-left: 1.5rem;
}

.markdown-preview :deep(li) {
  margin-bottom: 0.25rem;
}

.markdown-preview :deep(li > ul),
.markdown-preview :deep(li > ol) {
  margin-top: 0.25rem;
  margin-bottom: 0;
}

.markdown-preview :deep(strong) {
  font-weight: bold;
  color: v-bind("MARKDOWN_ACCENT.bold");
}

.markdown-preview :deep(em) {
  font-style: italic;
}

.markdown-preview :deep(a) {
  color: v-bind("MARKDOWN_ACCENT.link");
  text-decoration: underline;
}

.markdown-preview :deep(.wiki-link-broken) {
  color: var(--ui-text-dimmed);
  text-decoration: underline dashed;
  cursor: help;
}

.markdown-preview :deep(blockquote) {
  color: v-bind("MARKDOWN_ACCENT.comment");
  font-style: italic;
  border-left: 2px solid var(--ui-border);
  padding-left: 0.75rem;
  margin: 0 0 0.75rem;
}

.markdown-preview :deep(code) {
  color: v-bind("MARKDOWN_ACCENT.string");
  font-family: var(--font-mono, ui-monospace, monospace);
  background-color: var(--ui-bg-elevated);
  border-radius: 0.25rem;
  padding: 0.1rem 0.3rem;
}

.markdown-preview :deep(pre) {
  background-color: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin: 0 0 0.75rem;
  overflow-x: auto;
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-preview :deep(.mermaid-block) {
  display: block;
  background-color: #ffffff;
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin: 1rem 0;
  overflow-x: auto;
}

.markdown-preview :deep(.mermaid-block:first-child) {
  margin-top: 0;
}

.markdown-preview :deep(.mermaid-block:last-child) {
  margin-bottom: 0;
}

.markdown-preview :deep(.mermaid-zoom-button) {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e5e5e5;
  background-color: #ffffff;
  color: #4b5563;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s ease-in-out;
}

.markdown-preview :deep(.mermaid-block:hover .mermaid-zoom-button) {
  opacity: 1;
}
</style>
