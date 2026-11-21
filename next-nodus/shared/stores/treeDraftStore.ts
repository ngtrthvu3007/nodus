import { create } from "zustand";
import type { NodeKind } from "@/shared/types";
import { useSidebarStore } from "./sidebarStore";

export const DRAFT_MODE = { create: "create", rename: "rename" } as const;
export type DraftMode = (typeof DRAFT_MODE)[keyof typeof DRAFT_MODE];

// The name being typed inline in the sidebar tree (new node or rename); shared so any "New" menu can start it.
export type CreateDraft = { mode: typeof DRAFT_MODE.create; kind: NodeKind; parentId: string | null };
export type RenameDraft = { mode: typeof DRAFT_MODE.rename; nodeId: string };
export type TreeDraft = CreateDraft | RenameDraft;

type TreeDraftState = {
  draft: TreeDraft | null;
  startCreate: (kind: NodeKind, parentId: string | null) => void;
  startRename: (nodeId: string) => void;
  clearDraft: () => void;
};

export const useTreeDraftStore = create<TreeDraftState>((set) => ({
  draft: null,
  startCreate: (kind, parentId) => {
    useSidebarStore.getState().open();
    set({ draft: { mode: DRAFT_MODE.create, kind, parentId } });
  },
  startRename: (nodeId) => set({ draft: { mode: DRAFT_MODE.rename, nodeId } }),
  clearDraft: () => set({ draft: null }),
}));
