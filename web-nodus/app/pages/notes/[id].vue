<script setup lang="ts">
import type { ApiResponse, Note } from "~/types/note";
import { updateNote } from "~/apis/notes";

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
  }
  saving.value = false;
};

watch(note, syncNoteState, { immediate: true });

useBreadcrumbSetter(
  computed(() => [
    { label: "Nodus", icon: "i-lucide-house", to: "/" },
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
          <span class="size-1.5 shrink-0 rounded-full" :class="saveStatusDotClass" />
          {{ saveStatusText }}
        </span>
        <UButton color="neutral" variant="ghost" icon="i-lucide-panel-right" aria-label="Toggle graph" />
      </div>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px]">
      <div class="min-h-0 p-6">
        <UTextarea
          v-model="content"
          class="h-full w-full"
          :ui="{ base: 'h-full resize-none font-mono' }" />
      </div>

      <aside class="border-l border-default p-4">
        <div class="text-sm font-medium text-highlighted">Local graph</div>
        <p class="mt-2 text-sm text-muted">Links around this note will appear here.</p>
      </aside>
    </div>
  </div>
</template>
