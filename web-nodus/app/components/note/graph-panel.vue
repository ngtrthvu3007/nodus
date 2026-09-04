<script setup lang="ts">
import { defineConfigs, type Edges, type Nodes } from "v-network-graph";
import { ForceLayout } from "v-network-graph/lib/force-layout";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";

import type { LinkedNote } from "~/types/note";
import { MARKDOWN_ACCENT } from "~/constants/markdown-accent";
import { fetchNote } from "~/apis/notes";

const CENTER_NODE_ID = "__center__";

const props = defineProps<{
  noteId: string;
  noteTitle: string;
  backlinks: LinkedNote[];
  outgoingLinks: LinkedNote[];
}>();

const nodes = computed<Nodes>(() => {
  const linkedNotes = [...props.backlinks, ...props.outgoingLinks];
  return linkedNotes.reduce<Nodes>((result, link) => ({ ...result, [link.id]: { name: link.title } }), {
    [CENTER_NODE_ID]: { name: props.noteTitle || "Untitled" },
  });
});

const edges = computed<Edges>(() => {
  const incoming = props.backlinks.reduce<Edges>(
    (result, link, index) => ({
      ...result,
      [`backlink-${index}`]: { source: link.id, target: CENTER_NODE_ID },
    }),
    {},
  );
  const outgoing = props.outgoingLinks.reduce<Edges>(
    (result, link, index) => ({
      ...result,
      [`outgoing-${index}`]: { source: CENTER_NODE_ID, target: link.id },
    }),
    {},
  );

  return { ...incoming, ...outgoing };
});

const isEmpty = computed(() => props.backlinks.length === 0 && props.outgoingLinks.length === 0);

// Node width/height cố định — override-node vẽ shape thật (icon + title), config
// node ở đây chỉ dùng để reserve đúng bounding box cho v-network-graph tính layout.
const NODE_WIDTH = 120;
const NODE_HEIGHT = 32;
const LINK_DISTANCE = 160;

const configs = defineConfigs({
  view: {
    layoutHandler: new ForceLayout({
      createSimulation: (_d3, nodes, edges) => {
        const linkForce = forceLink<(typeof nodes)[number], (typeof edges)[number]>(edges)
          .id((node) => node.id)
          .distance(LINK_DISTANCE);

        return forceSimulation(nodes)
          .force("edge", linkForce)
          .force("charge", forceManyBody().strength(-600))
          .force("collide", forceCollide(NODE_WIDTH / 2))
          .force("x", forceX())
          .force("y", forceY())
          .alphaMin(0.05);
      },
    }),
  },
  node: {
    normal: {
      type: "rect",
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      borderRadius: 6,
      color: "transparent",
      strokeWidth: 0,
    },
    label: { visible: false },
    // Layout tự tính qua ForceLayout — tắt kéo-thả để tránh nuốt mất click
    // (mousedown/mouseup nhỏ vẫn bị hiểu là 1 lần drag nếu bật draggable).
    draggable: false,
  },
  edge: {
    gap: 20,
    normal: { color: "var(--ui-text-dimmed)", width: 1.5 },
    marker: { target: { type: "circle", width: 5, height: 5 } },
  },
});

const router = useRouter();

// Cache content theo noteId — hover lặp lại cùng 1 node không gọi lại API.
// reactive() để template tự re-render khi cache được điền sau khi fetch xong.
const contentCache = reactive<Record<string, string>>({});
const previewLoading = ref<string | null>(null);

const PREVIEW_LINE_COUNT = 6;

// Cắt content trước khi render — popover chỉ cần preview vài dòng đầu, không
// nên đưa cả note dài vào markdown-it/mermaid chỉ để CSS ẩn bớt đi.
const truncateForPreview = (content: string) => {
  const allLines = content.split("\n");
  const preview = allLines.slice(0, PREVIEW_LINE_COUNT).join("\n");
  return allLines.length > PREVIEW_LINE_COUNT ? `${preview}\n…` : preview;
};

const loadPreview = async (nodeId: string) => {
  if (nodeId === CENTER_NODE_ID || nodeId in contentCache) {
    return;
  }

  previewLoading.value = nodeId;
  const response = await fetchNote(nodeId);
  contentCache[nodeId] = truncateForPreview(response?.data.content ?? "");
  if (previewLoading.value === nodeId) {
    previewLoading.value = null;
  }
};
</script>

<template>
  <div class="flex h-full flex-col">
    <p v-if="isEmpty" class="p-2 text-sm text-muted">No linked notes to visualize yet.</p>

    <template v-else>
      <p class="px-2 pb-1 text-xs text-muted">
        Lines follow <code class="graph-hint-code">[[wiki-links]]</code> in note content, not folder hierarchy.
      </p>

      <VNetworkGraph class="min-h-0 flex-1" :nodes="nodes" :edges="edges" :configs="configs">
        <template #override-node="{ nodeId, scale }">
          <foreignObject
            :x="-(NODE_WIDTH * scale) / 2"
            :y="-(NODE_HEIGHT * scale) / 2"
            :width="NODE_WIDTH * scale"
            :height="NODE_HEIGHT * scale">
            <UPopover
              v-if="nodeId !== CENTER_NODE_ID"
              mode="hover"
              :content="{ side: 'top' }"
              @update:open="(open) => open && loadPreview(nodeId)">
              <div class="graph-node" @click="router.push(`/notes/${nodeId}`)">
                <UIcon name="i-lucide-file-text" class="graph-node-icon" />
                <span class="graph-node-title">{{ nodes[nodeId]?.name }}</span>
              </div>

              <template #content>
                <div class="graph-node-preview">
                  <div class="graph-node-preview-title">{{ nodes[nodeId]?.name }}</div>
                  <p v-if="previewLoading === nodeId" class="graph-node-preview-body-text text-muted">
                    Loading...
                  </p>
                  <p v-else-if="!contentCache[nodeId]" class="graph-node-preview-body-text text-muted">
                    Empty note.
                  </p>
                  <EditorMarkdownPreview
                    v-else
                    :content="contentCache[nodeId]"
                    :outgoing-links="[]"
                    class="graph-node-preview-body" />
                </div>
              </template>
            </UPopover>

            <div v-else class="graph-node graph-node--center">
              <UIcon name="i-lucide-file-text" class="graph-node-icon" />
              <span class="graph-node-title">{{ nodes[nodeId]?.name }}</span>
            </div>
          </foreignObject>
        </template>
      </VNetworkGraph>
    </template>
  </div>
</template>

<style scoped>
.graph-hint-code {
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--ui-text);
}

.graph-node {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  height: 100%;
  padding: 0 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--ui-border-accented);
  background-color: var(--ui-bg-elevated);
  cursor: pointer;
  box-sizing: border-box;
}

.graph-node--center {
  border-color: v-bind("MARKDOWN_ACCENT.heading");
  background-color: var(--ui-bg);
}

.graph-node-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  color: var(--ui-text-muted);
}

.graph-node--center .graph-node-icon {
  color: v-bind("MARKDOWN_ACCENT.heading");
}

.graph-node-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--ui-text);
}

.graph-node-preview {
  max-width: 320px;
  padding: 0.75rem;
}

.graph-node-preview-title {
  margin-bottom: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ui-text-highlighted);
}

.graph-node-preview-body-text {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--ui-text-muted);
}

.graph-node-preview-body {
  max-height: 160px;
  overflow: hidden;
  font-size: 0.8125rem;
}
</style>
