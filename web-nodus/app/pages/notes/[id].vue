<script setup lang="ts">
import type { SplitterItem } from "@nuxt/ui";

import type { ApiResponse, LinkedNote, Note } from "~/types/note";
import { fetchNoteLinks, updateNote } from "~/apis/notes";

const BACKLINKS_PANEL_INDEX = 1;
const splitterItems: SplitterItem[] = [
  { slot: "content", class: "min-h-0 min-w-0 flex-col overflow-hidden" },
  {
    slot: "backlinks",
    sizeUnit: "px",
    minSize: 200,
    defaultSize: 300,
    maxSize: 480,
    collapsible: true,
    collapsedSize: 0,
    class:
      "min-h-0 min-w-0 flex-col overflow-hidden border-l border-default transition-[flex-grow] duration-300 ease-in-out",
  },
];
const splitterUi = { handle: "w-0" };

const splitter = useTemplateRef<{ panelsRef: { expand: () => void; collapse: () => void }[] }>(
  "splitter",
);
const splitterReady = ref(false);
const backlinksCollapsed = ref(false);

onMounted(async () => {
  await nextTick();
  splitterReady.value = true;
});

const toggleBacklinks = () => {
  const panel = splitter.value?.panelsRef[BACKLINKS_PANEL_INDEX];
  if (backlinksCollapsed.value) {
    panel?.expand();
  } else {
    panel?.collapse();
  }
};

const updateBacklinksCollapsed = (index: number, collapsed: boolean) => {
  if (index === BACKLINKS_PANEL_INDEX) {
    backlinksCollapsed.value = collapsed;
  }
};

const route = useRoute();
const noteId = computed(() => String(route.params.id));
const { data, error, pending } = await useFetch<ApiResponse<Note>>(() => `/api/notes/${noteId.value}`);

const note = computed(() => data.value?.data);
const title = ref("");
const content = ref("");
const lastSavedAt = ref("");
const saving = ref(false);
const initialized = ref(false);
const savedSnapshot = ref({ title: "", content: "" });
const outgoingLinks = ref<LinkedNote[]>([]);
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const isDirty = computed(
  () => title.value !== savedSnapshot.value.title || content.value !== savedSnapshot.value.content,
);

const saveState = computed<"unsaved" | "saving" | "saved" | "idle">(() => {
  if (saving.value) {
    return "saving";
  }
  if (isDirty.value) {
    return "unsaved";
  }
  if (lastSavedAt.value) {
    return "saved";
  }
  return "idle";
});

const saveStatusText = computed(() => {
  switch (saveState.value) {
    case "unsaved":
      return "Unsaved changes";
    case "saving":
      return "Saving...";
    case "saved":
      return `Saved ${new Date(lastSavedAt.value).toLocaleTimeString()}`;
    default:
      return `Viewing ${noteId.value}`;
  }
});

const saveStatusDotClass = computed(() => {
  switch (saveState.value) {
    case "unsaved":
      return "bg-warning animate-pulse";
    case "saving":
      return "bg-primary animate-pulse";
    case "saved":
      return "bg-success";
    default:
      return "bg-muted";
  }
});

const syncNoteState = (value?: Note) => {
  if (!value) {
    return;
  }

  title.value = value.title;
  content.value = value.content;
  lastSavedAt.value = value.updatedAt;
  savedSnapshot.value = { title: value.title, content: value.content };
  initialized.value = true;
};

const loadOutgoingLinks = async () => {
  const response = await fetchNoteLinks(noteId.value);
  outgoingLinks.value = response?.data.outgoing ?? [];
};

const saveNote = async () => {
  if (!initialized.value) {
    return;
  }

  if (title.value === savedSnapshot.value.title && content.value === savedSnapshot.value.content) {
    return;
  }

  saving.value = true;
  const response = await updateNote(noteId.value, { title: title.value, content: content.value });
  if (response) {
    syncNoteState(response.data);
    await loadOutgoingLinks();
  }
  saving.value = false;
};

watch(note, syncNoteState, { immediate: true });
watch(noteId, loadOutgoingLinks, { immediate: true });

useBreadcrumbSetter(
  computed(() => [
    { label: "Nodus", slot: "home", to: "/" },
    { label: note.value?.title ?? "Note", icon: "i-lucide-file-text" },
  ]),
);

watch([title, content], () => {
  if (!initialized.value) {
    return;
  }

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    void saveNote();
  }, 800);
});

onBeforeUnmount(() => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
});
</script>

<template>
  <div v-if="pending" class="p-6">
    <USkeleton class="h-10 w-64" />
    <USkeleton class="mt-6 h-96 w-full" />
  </div>

  <UAlert
    v-else-if="error || !note"
    class="m-6"
    color="error"
    variant="subtle"
    title="Could not load note"
    description="The note may not exist or the API is unavailable." />

  <div v-else class="flex h-full min-h-0 flex-col">
    <div class="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-default px-6">
      <UInput
        v-model="title"
        variant="ghost"
        class="min-w-0 flex-1"
        :ui="{ base: 'text-lg font-semibold text-highlighted px-0' }" />

      <div class="flex items-center gap-2">
        <span class="flex items-center gap-1.5 text-xs text-muted">
          <span class="size-2 shrink-0 rounded-full" :class="saveStatusDotClass" />
          {{ saveStatusText }}
        </span>
        <UButton
          v-if="backlinksCollapsed"
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left-to-line"
          aria-label="Expand backlinks"
          @click="toggleBacklinks" />
      </div>
    </div>

    <USplitter
      v-if="splitterReady"
      ref="splitter"
      :items="splitterItems"
      class="min-h-0 flex-1"
      :ui="splitterUi"
      @collapse="updateBacklinksCollapsed($event, true)"
      @expand="updateBacklinksCollapsed($event, false)">
      <template #content>
        <div class="h-full min-h-0 p-6">
          <EditorCodeMirror v-model="content" class="h-full rounded-md border border-default p-3" />
        </div>
      </template>

      <template #backlinks>
        <NoteBacklinksPanel
          :note-id="noteId"
          :note-title="title"
          :content="content"
          :outgoing-links="outgoingLinks"
          @collapse="toggleBacklinks" />
      </template>
    </USplitter>
  </div>
</template>
