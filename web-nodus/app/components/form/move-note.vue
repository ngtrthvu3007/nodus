<script setup lang="ts">
import type { Note } from "~/types/note";
import type { Folder } from "~/types/folder";

const props = defineProps<{ note: Note; folders: Folder[] }>();

const ROOT_VALUE = "__root__";

const folderId = ref<string>(props.note.folderId ?? ROOT_VALUE);

const folderOptions = computed(() => [
  { label: "Root — no folder", value: ROOT_VALUE },
  ...props.folders.map((folder) => ({ label: folder.name, value: folder.id })),
]);

const submit = () => ({
  note: props.note,
  folderId: folderId.value === ROOT_VALUE ? null : folderId.value,
});

defineExpose({ submit });
</script>

<template>
  <UFormField label="Folder">
    <USelectMenu v-model="folderId" :items="folderOptions" value-key="value" label-key="label" class="w-full" />
  </UFormField>
</template>
