<script setup lang="ts">
import type { Folder } from "~/types/folder";
import type { Note } from "~/types/note";

const props = defineProps<{ folders: Folder[]; parentNote?: Note | null; initialFolderId?: string | null }>();

const ROOT_VALUE = "__root__";

const title = ref("");
const folderId = ref<string>(props.initialFolderId ?? ROOT_VALUE);

const folderOptions = computed(() => [
  { label: "Root — no folder", value: ROOT_VALUE },
  ...props.folders.map((folder) => ({ label: folder.name, value: folder.id })),
]);

const isTitleValid = computed(() => Boolean(title.value.trim()));

const submit = () => {
  if (!isTitleValid.value) {
    return null;
  }

  return {
    title: title.value.trim(),
    folderId: props.parentNote ? props.parentNote.folderId : folderId.value === ROOT_VALUE ? null : folderId.value,
    parentNoteId: props.parentNote?.id ?? null,
  };
};

defineExpose({ submit });
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Title" required>
      <UInput v-model="title" autofocus placeholder="Note title" class="w-full" />
    </UFormField>

    <UFormField v-if="!parentNote && !initialFolderId" label="Folder">
      <USelectMenu v-model="folderId" :items="folderOptions" value-key="value" label-key="label" class="w-full" />
    </UFormField>
  </div>
</template>
