"use client";
import type { TreeProps } from "antd";
import { useRef, type Key } from "react";
import { useToast } from "@/shared/hooks";
import { NODE_KIND, type NodeKind } from "@/shared/constants";
import { DRAFT_ID, type TreeModel } from "./useTreeModel";
import { useMoveNode } from "./useTreeQueries";

type UseTreeDragInput = {
  model: TreeModel;
  onExpand: (id: string) => void;
  // Reports the doc a dragged folder hovers over (it cannot go inside), or null.
  onBlockDoc: (id: string | null) => void;
};

export const useTreeDrag = ({ model, onExpand, onBlockDoc }: UseTreeDragInput) => {
  const toast = useToast();
  const moveNode = useMoveNode();

  const draggedKind = useRef<NodeKind | null>(null);

  const refusedInsideKey = useRef<string | null>(null);

  const getNode = (key: Key) => model.nodesById.get(String(key));

  const onDragStart: NonNullable<TreeProps["onDragStart"]> = ({ node }) => {
    draggedKind.current = getNode(node.key)?.kind ?? null;
    refusedInsideKey.current = null;
  };

  const allowDrop: NonNullable<TreeProps["allowDrop"]> = ({ dropNode, dropPosition }) => {
    const key = String(dropNode.key);
    if (key === DRAFT_ID) return false;

    /* 
    A doc can hold child docs but not folders: only the "inside" 
    zone of a doc is refused. Hovering the
    top or bottom edge still places the folder before or after it.
    */
    if (draggedKind.current === NODE_KIND.folder && getNode(key)?.kind === NODE_KIND.doc) {
      if (dropPosition === 0) {
        refusedInsideKey.current = key;
        onBlockDoc(key);
        return false;
      }
      if (dropPosition === 1 && refusedInsideKey.current === key) {
        refusedInsideKey.current = null;
        return false;
      }
    }

    refusedInsideKey.current = null;
    onBlockDoc(null);
    return true;
  };

  const onDragEnd: NonNullable<TreeProps["onDragEnd"]> = () => onBlockDoc(null);

  const onDrop: NonNullable<TreeProps["onDrop"]> = ({ dragNode, node, dropToGap, dropPosition }) => {
    const dragged = getNode(dragNode.key);

    const targetIndex = Number(node.pos.split("-").pop());

    const request = model.getMoveRequest({
      dragId: String(dragNode.key),
      targetId: String(node.key),
      dropToGap,
      relativePosition: dropPosition - targetIndex,
    });
    if (!dragged || !request) return;

    moveNode.mutate({ kind: dragged.kind, id: dragged.id, ...request }, { onError: (error) => toast.error(error) });
    if (request.parentId) onExpand(request.parentId);
  };

  return { onDragStart, onDragEnd, allowDrop, onDrop };
};
