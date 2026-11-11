"use client";

import { App } from "antd";
import { useRouter } from "next/navigation";
import { PAGE_ROUTES } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import type { NodeKind, TreeNode } from "@/shared/types";
import { DRAFT_MODE, useTreeDraftStore, type CreateDraft, type RenameDraft } from "@/shared/stores";
import type { TreeModel } from "./useTreeModel";
import { useCreateNode, useDeleteNode, useRenameNode } from "./useTreeQueries";

export type TreeActions = {
  openCreate: (kind: NodeKind, parentId: string | null) => void;
  openRename: (node: TreeNode) => void;
  confirmDelete: (node: TreeNode) => void;
};

type UseTreeActionsInput = {
  model: TreeModel;
  onExpand: (id: string) => void;
};

export const useTreeActions = ({ model, onExpand }: UseTreeActionsInput) => {
  const { modal } = App.useApp();
  const toast = useToast();
  const router = useRouter();
  const createNode = useCreateNode();
  const renameNode = useRenameNode();
  const deleteNode = useDeleteNode();
  const { draft, startCreate, startRename, clearDraft } = useTreeDraftStore();

  const createFromDraft = async (createDraft: CreateDraft, name: string) => {
    const created = await createNode.mutateAsync({ kind: createDraft.kind, name, parentId: createDraft.parentId });
    if (createDraft.parentId) onExpand(createDraft.parentId);
    clearDraft();
    router.push(PAGE_ROUTES.node(createDraft.kind, created.id));
  };

  const renameFromDraft = async (renameDraft: RenameDraft, name: string) => {
    const node = model.nodesById.get(renameDraft.nodeId);
    if (node) await renameNode.mutateAsync({ kind: node.kind, id: node.id, name });
    clearDraft();
  };

  const submitDraft = async (name: string): Promise<boolean> => {
    if (!draft) return false;

    try {
      if (draft.mode === DRAFT_MODE.create) await createFromDraft(draft, name);
      else await renameFromDraft(draft, name);

      return true;
    } catch (error) {
      toast.error(error);
      return false;
    }
  };

  const confirmDelete = (node: TreeNode) => {
    const removedIds = model.getSubtreeIds(node.id);
    const innerCount = removedIds.length - 1;
    const inner = innerCount === 1 ? "1 item" : `${innerCount} items`;

    modal.confirm({
      title: `Delete "${node.name}"?`,
      content: innerCount
        ? `${inner} inside will also be deleted and cannot be restored. Move out anything you want to keep first.`
        : undefined,
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      // The open tabs move the page when the one on screen is deleted (to the tab next to it, or home).
      onOk: async () => {
        try {
          await deleteNode.mutateAsync({ kind: node.kind, id: node.id });
        } catch (error) {
          toast.error(error);
        }
      },
    });
  };

  const actions: TreeActions = {
    openCreate: startCreate,
    openRename: (node) => startRename(node.id),
    confirmDelete,
  };

  return { actions, submitDraft };
};
