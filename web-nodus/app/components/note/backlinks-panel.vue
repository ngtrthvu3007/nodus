<script setup lang="ts">
import type { LinkedNote } from "~/types/note";
import { fetchNoteLinks } from "~/apis/notes";

const props = defineProps<{ noteId: string; noteTitle: string; content: string; outgoingLinks: LinkedNote[] }>();
const emit = defineEmits<{ collapse: [] }>();

const activeTab = ref<"preview" | "backlinks" | "graph">("preview");
const isPreviewZoomOpen = ref(false);

const backlinks = ref<LinkedNote[]>([]);
const backlinksPending = ref(false);

const loadBacklinks = async () => {
  backlinksPending.value = true;
  const response = await fetchNoteLinks(props.noteId);
  backlinks.value = response?.data.backlinks ?? [];
  backlinksPending.value = false;
};

const needsBacklinks = (tab: typeof activeTab.value) => tab === "backlinks" || tab === "graph";

watch(
  () => props.noteId,
  () => {
    if (needsBacklinks(activeTab.value)) {
      void loadBacklinks();
    }
  },
);

watch(activeTab, (tab) => {
  if (needsBacklinks(tab)) {
    void loadBacklinks();
  }
});
</script>

<template>
  <aside class="flex h-full flex-col p-4">
    <div class="flex items-center justify-between gap-2 border-b pb-2">
      <UTabs
        v-model="activeTab"
        variant="link"
        color="neutral"
        :items="[
          { label: 'Preview', value: 'preview' },
          { label: 'Links', value: 'backlinks' },
          { label: 'Graph', value: 'graph' },
        ]"
        size="xs"
        :ui="{ root: 'w-auto', list: 'w-auto' }" />

      <div class="flex items-center gap-1">
        <UButton
          v-if="activeTab === 'preview'"
          color="neutral"
          variant="ghost"
          size="md"
          icon="i-lucide-maximize-2"
          aria-label="Expand preview"
          @click="isPreviewZoomOpen = true" />

        <UButton
          color="neutral"
          variant="ghost"
          size="md"
          icon="i-lucide-arrow-right-to-line"
          aria-label="Collapse backlinks"
          @click="emit('collapse')" />
      </div>
    </div>

    <div class="mt-2 min-h-0 flex-1 overflow-auto rounded-md border border-muted bg-elevated/50 px-2 pt-2">
      <EditorMarkdownPreview
        v-if="activeTab === 'preview'"
        :content="content"
        :outgoing-links="outgoingLinks"
        class="h-full" />

      <LazyNoteGraphPanel
        v-else-if="activeTab === 'graph'"
        :note-id="noteId"
        :note-title="noteTitle"
        :backlinks="backlinks"
        :outgoing-links="outgoingLinks"
        class="h-full" />

      <template v-else>
        <p v-if="backlinksPending" class="text-sm text-muted">Loading...</p>

        <template v-else>
          <div class="pb-3">
            <div class="px-2 pb-1 text-xs font-medium uppercase text-muted">
              Backlinks ({{ backlinks.length }})
            </div>

            <p v-if="backlinks.length === 0" class="px-2 text-sm text-muted">
              No notes link to this note yet.
            </p>

            <ul v-else class="flex flex-col gap-1">
              <li v-for="link in backlinks" :key="link.id">
                <NuxtLink
                  :to="`/notes/${link.id}`"
                  class="block truncate rounded-md px-2 py-1.5 text-sm text-highlighted hover:bg-elevated">
                  {{ link.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div class="border-t border-muted pb-2 pt-3">
            <div class="px-2 pb-1 text-xs font-medium uppercase text-muted">
              Outgoing ({{ outgoingLinks.length }})
            </div>

            <p v-if="outgoingLinks.length === 0" class="px-2 text-sm text-muted">
              This note doesn't link to any other note yet.
            </p>

            <ul v-else class="flex flex-col gap-1">
              <li v-for="link in outgoingLinks" :key="link.id">
                <NuxtLink
                  :to="`/notes/${link.id}`"
                  class="block truncate rounded-md px-2 py-1.5 text-sm text-highlighted hover:bg-elevated">
                  {{ link.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </template>
      </template>
    </div>
  </aside>

  <UModal v-model:open="isPreviewZoomOpen" title="Preview" :ui="{ content: 'max-w-4xl' }">
    <template #body>
      <EditorMarkdownPreview :content="content" :outgoing-links="outgoingLinks" class="max-h-[75vh]" />
    </template>
  </UModal>
</template>
