"use client";
import type { TreeDataNode } from "antd";
import { useMemo } from "react";
import { DRAFT_MODE, useTreeDraftStore, type CreateDraft, type TreeDraft } from "@/shared/stores";
import { NODE_KIND, type NodeKind } from "@/shared/constants";
import type { MoveRequest, TreeNode } from "@/shared/types";

export type NodeData = TreeDataNode & {
  key: string;
  kind: NodeKind;
  name: string;
  children?: NodeData[];
};

type DropInput = {
  dragId: string;
  targetId: string;
  dropToGap: boolean;
  relativePosition: number;
};

export type TreeModel = ReturnType<typeof useTreeModel>;

export const DRAFT_ID = "__draft__";

const ROOT = "root";
const NO_NODES: TreeNode[] = [];

const byPosition = (a: TreeNode, b: TreeNode): number => a.position - b.position;
const groupByParent = (nodes: TreeNode[]) => Object.groupBy(nodes, (node) => node.parentId ?? ROOT);

const buildTreeData = (nodes: TreeNode[], disabledId: string | null): NodeData[] => {
  const groups = groupByParent(nodes);

  const build = (parentKey: string): NodeData[] =>
    (groups[parentKey] ?? []).toSorted(byPosition).map((node) => {
      const children = build(node.id);
      return {
        key: node.id,
        kind: node.kind,
        name: node.name,
        children,
        isLeaf: node.kind === NODE_KIND.doc && !children.length,
        disabled: node.id === disabledId,
      };
    });

  return build(ROOT);
};

const toDraftNode = (draft: CreateDraft): TreeNode => ({
  id: DRAFT_ID,
  parentId: draft.parentId,
  kind: draft.kind,
  name: "",
  position: Number.MAX_SAFE_INTEGER,
});

const withCreateDraft = (nodes: TreeNode[], draft: TreeDraft | null): TreeNode[] =>
  draft?.mode === DRAFT_MODE.create ? [...nodes, toDraftNode(draft)] : nodes;

const getMoveRequest = (nodes: TreeNode[], input: DropInput): MoveRequest | null => {
  const { dragId, targetId, dropToGap, relativePosition } = input;
  if (!dropToGap) return { parentId: targetId, afterId: null };

  const target = nodes.find((node) => node.id === targetId);
  if (!target) return null;

  if (relativePosition > 0) return { parentId: target.parentId, afterId: targetId };

  const siblings = (groupByParent(nodes)[target.parentId ?? ROOT] ?? [])
    .filter((node) => node.id !== dragId)
    .toSorted(byPosition);
  const index = siblings.findIndex((node) => node.id === targetId);

  return { parentId: target.parentId, afterId: index > 0 ? siblings[index - 1].id : null };
};

const getSubtreeIds = (nodes: TreeNode[], id: string): string[] => {
  const groups = groupByParent(nodes);
  const collect = (nodeId: string): string[] => [
    nodeId,
    ...(groups[nodeId] ?? []).flatMap((child) => collect(child.id)),
  ];

  return collect(id);
};

// From the root down to the node itself; empty when the node is not in the tree.
const getPath = (nodesById: Map<string, TreeNode>, id: string): TreeNode[] => {
  const walk = (node: TreeNode | undefined): TreeNode[] =>
    node ? [...walk(node.parentId ? nodesById.get(node.parentId) : undefined), node] : [];

  return walk(nodesById.get(id));
};

// First doc in reading order (depth first, folders skipped), or null when there is no doc.
const getFirstDocId = (nodes: TreeNode[]): string | null => {
  const groups = groupByParent(nodes);

  const find = (parentKey: string): string | null => {
    for (const node of (groups[parentKey] ?? []).toSorted(byPosition)) {
      const found = node.kind === NODE_KIND.doc ? node.id : find(node.id);
      if (found) return found;
    }
    return null;
  };

  return find(ROOT);
};

// `disabledId`: the node antd shows disabled, e.g. a doc a dragged folder cannot go into.
export const useTreeModel = (nodes: TreeNode[] = NO_NODES, disabledId: string | null = null) => {
  const draft = useTreeDraftStore((state) => state.draft);
  const treeData = useMemo(
    () => buildTreeData(withCreateDraft(nodes, draft), disabledId),
    [nodes, draft, disabledId],
  );

  const queries = useMemo(() => {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    return {
      nodes,
      nodesById,
      parentIds: Object.keys(groupByParent(nodes)).filter((key) => key !== ROOT),
      firstDocId: getFirstDocId(nodes),
      getPath: (id: string) => getPath(nodesById, id),
      getSubtreeIds: (id: string) => getSubtreeIds(nodes, id),
      getMoveRequest: (input: DropInput) => getMoveRequest(nodes, input),
    };
  }, [nodes]);

  return { ...queries, treeData };
};
