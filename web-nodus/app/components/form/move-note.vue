<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import type { MoveNoteParams, Note } from "~/types/note";
import type { Folder } from "~/types/folder";

const props = defineProps<{ note: Note; folders: Folder[]; notes: Note[] }>();

const ROOT_VALUE = "root";
const FOLDER_PREFIX = "folder:";
const NOTE_PREFIX = "note:";

const toLocationValue = (note: Note) => {
  if (note.parentNoteId) {
    return `${NOTE_PREFIX}${note.parentNoteId}`;
  }
  return note.folderId ? `${FOLDER_PREFIX}${note.folderId}` : ROOT_VALUE;
};

const currentValue = toLocationValue(props.note);
const target = ref(currentValue);

// Note gốc đang có con chỉ được đổi folder — thành note con sẽ tạo 3 level.
const parentCandidates = computed(() =>
  props.note.hasChildren ? [] : props.notes.filter((note) => !note.parentNoteId && note.id !== props.note.id),
);

const items = computed<SelectMenuItem[][]>(() => {
  const folderItems: SelectMenuItem[] = [
    { type: "label", label: "Folder" },
    { label: "Root — no folder", value: ROOT_VALUE },
    ...props.folders.map((folder) => ({ label: folder.name, value: `${FOLDER_PREFIX}${folder.id}` })),
  ];

  if (!parentCandidates.value.length) {
    return [folderItems];
  }

  const noteItems: SelectMenuItem[] = [
    { type: "label", label: "Child of note" },
    ...parentCandidates.value.map((note) => ({ label: note.title, value: `${NOTE_PREFIX}${note.id}` })),
  ];

  return [folderItems, noteItems];
});

const currentParent = computed(() => props.notes.find((note) => note.id === props.note.parentNoteId));

const help = computed(() => {
  if (props.note.hasChildren) {
    return "Notes with child notes can only move to a folder.";
  }
  if (currentParent.value && target.value !== currentValue) {
    return `This note will be detached from "${currentParent.value.title}".`;
  }
  return undefined;
});

const toIdAfter = (prefix: string) => (target.value.startsWith(prefix) ? target.value.slice(prefix.length) : null);

const submit = (): { note: Note } & MoveNoteParams => ({
  note: props.note,
  folderId: toIdAfter(FOLDER_PREFIX),
  parentNoteId: toIdAfter(NOTE_PREFIX),
});

defineExpose({ submit });
</script>

<template>
  <UFormField label="Move to" :help="help">
    <USelectMenu v-model="target" :items="items" value-key="value" label-key="label" class="w-full" />
  </UFormField>
</template>
