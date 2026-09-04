import type { TreeItem } from "@nuxt/ui";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import type { Note } from "~/types/note";
import type { Folder } from "~/types/folder";
import { SIDEBAR_GROUP, type SidebarGroupId } from "~/constants/sidebar";

export interface NoteTreeItem extends TreeItem {
  id: string;
  to?: string;
  children?: NoteTreeItem[];
}

export interface NoteTreeGroup {
  id: SidebarGroupId;
  label: string;
  items: NoteTreeItem[];
}

// Group notes by a key once (O(n)), so building the tree never re-scans the full note list.
export const groupBy = (notes: Note[], getKey: (note: Note) => string | null): Map<string, Note[]> =>
  notes.reduce((map, note) => {
    const key = getKey(note);
    if (!key) {
      return map;
    }

    map.set(key, [...(map.get(key) ?? []), note]);
    return map;
  }, new Map<string, Note[]>());

const toEmptyPlaceholder = (folderId: string): NoteTreeItem => ({
  id: `${folderId}-empty`,
  label: "Empty",
  disabled: true,
});

export const toNoteTreeItem = (note: Note, childrenByParentId: Map<string, Note[]>): NoteTreeItem => {
  const children = childrenByParentId.get(note.id);

  return {
    id: note.id,
    label: note.title,
    icon: "i-lucide-file-text",
    to: `/notes/${note.id}`,
    // UTree tự mở sẵn item có children — không cần tự quản lý expanded state.
    defaultExpanded: Boolean(children?.length),
    children: children?.map((child) => toNoteTreeItem(child, childrenByParentId)),
  };
};

// Shared so search results (flat list) and the sidebar tree render notes identically
// (same icon, active class, click behavior) via the same UTree component.
export const mapActive = (item: NoteTreeItem, route: RouteLocationNormalizedLoaded): NoteTreeItem => ({
  ...item,
  class: item.to && route.path === item.to ? "bg-elevated text-highlighted" : item.class,
  children: item.children?.map((child) => mapActive(child, route)),
  onSelect: () => {
    if (item.to) {
      void navigateTo(item.to);
    }
  },
});

export const useNoteTree = (notes: Ref<Note[]>, folders: Ref<Folder[]>) => {
  const route = useRoute();

  const childrenByParentId = computed(() => groupBy(notes.value, (note) => note.parentNoteId));

  const rootNotes = computed(() => notes.value.filter((note) => !note.folderId && !note.parentNoteId));

  const notesByFolderId = computed(() =>
    groupBy(
      notes.value.filter((note) => !note.parentNoteId),
      (note) => note.folderId,
    ),
  );

  const notesGroup = computed<NoteTreeGroup>(() => ({
    ...SIDEBAR_GROUP.notes,
    items: rootNotes.value.map((note) => toNoteTreeItem(note, childrenByParentId.value)),
  }));

  const foldersGroup = computed<NoteTreeGroup>(() => ({
    ...SIDEBAR_GROUP.folders,
    items: folders.value.map((folder) => {
      const folderNotes = notesByFolderId.value.get(folder.id);

      return {
        id: folder.id,
        label: folder.name,
        icon: "i-lucide-folder",
        defaultExpanded: Boolean(folderNotes?.length),
        children: folderNotes?.length
          ? folderNotes.map((note) => toNoteTreeItem(note, childrenByParentId.value))
          : [toEmptyPlaceholder(folder.id)],
      };
    }),
  }));

  const groups = computed<NoteTreeGroup[]>(() => [
    { ...notesGroup.value, items: notesGroup.value.items.map((item) => mapActive(item, route)) },
    { ...foldersGroup.value, items: foldersGroup.value.items.map((item) => mapActive(item, route)) },
  ]);

  return { groups };
};
