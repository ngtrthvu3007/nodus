"use client";

import { ChevronDownIcon, ChevronRightIcon, EllipsisVerticalIcon } from "lucide-react";
import { Skeleton, Tree, type TreeProps } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LoadError } from "@/shared/components";
import { PAGE_ROUTES } from "@/shared/constants";
import { useIsNarrowScreen } from "@/shared/hooks";
import { DRAFT_MODE, useSidebarStore, useTreeDraftStore } from "@/shared/stores";
import { NewNodeMenu, NodeNameInput, TreeNodeTitle } from "./components";
import { DRAFT_ID, useTree, useTreeActions, useTreeDrag, useTreeExpansion, useTreeModel } from "./hooks";

const DRAG_HANDLE = (
  <span className="flex -space-x-2">
    <EllipsisVerticalIcon className="size-3" />
    <EllipsisVerticalIcon className="size-3" />
  </span>
);

const SKELETON_INDENTS = ["pl-0", "pl-4", "pl-4", "pl-8", "pl-0", "pl-4", "pl-0"];

const TreeSkeleton = () => (
  <div className="flex flex-col gap-2 px-2 py-3" aria-hidden>
    {SKELETON_INDENTS.map((indent, index) => (
      <div key={index} className={indent}>
        <Skeleton.Input active block size="small" />
      </div>
    ))}
  </div>
);

const renderSwitcherIcon =({ expanded }: { expanded?: boolean }) => (
  <span className="absolute inset-0 flex items-center justify-center text-fg-muted">
    {expanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
  </span>
);

export const TreeView = () => {
  const router = useRouter();
  const isNarrow = useIsNarrowScreen();
  const closeSidebar = useSidebarStore((state) => state.close);
  const { id: selectedId = null } = useParams<{ id?: string }>(); //Both doc and folder name their dynamic segment `id`.
  const { data, isPending, isError, refetch } = useTree();
  const draft = useTreeDraftStore((state) => state.draft);
  const clearDraft = useTreeDraftStore((state) => state.clearDraft);

  const [blockedDocId, setBlockedDocId] = useState<string | null>(null);
  const model = useTreeModel(data, blockedDocId);

  const { expandedKeys, onExpand, expand } = useTreeExpansion({
    model,
    selectedId,
    forcedOpenId: draft?.mode === DRAFT_MODE.create ? draft.parentId : null,
  });
  const { actions, submitDraft } = useTreeActions({ model, onExpand: expand });
  const drag = useTreeDrag({ model, onExpand: expand, onBlockDoc: setBlockedDocId });

  if (isPending) return <TreeSkeleton />;

  if (isError) return <LoadError title="Could not load the tree" onRetry={refetch} />;

  const isEditingKey = (key: string) => key === DRAFT_ID || (draft?.mode === DRAFT_MODE.rename && draft.nodeId === key);

  const draggable = {
    icon: DRAG_HANDLE,
    nodeDraggable: (node: { key: unknown }) => !isEditingKey(String(node.key)),
  };

  const selectNode: TreeProps["onSelect"] = (_keys, { node }) => {
    const item = model.nodesById.get(String(node.key));
    if (item) router.push(PAGE_ROUTES.node(item.kind, item.id));
    // Tapping the page that is already open changes no URL, so AppShell would leave the phone menu open.
    if (isNarrow) closeSidebar();
  };

  const renderTitle: TreeProps["titleRender"] = (node) => {
    if (node.key === DRAFT_ID) {
      return draft?.mode === DRAFT_MODE.create ? (
        <NodeNameInput kind={draft.kind} initialName="" onSubmit={submitDraft} onCancel={clearDraft} />
      ) : null;
    }

    const item = model.nodesById.get(String(node.key));
    if (!item) return null;

    return (
      <TreeNodeTitle node={item} expanded={expandedKeys.includes(item.id)} actions={actions} onRename={submitDraft} />
    );
  };

  return (
    <div className="flex flex-col gap-2 pb-2">
      <NewNodeMenu parentId={null} type="primary" size="middle" block />

      {model.nodes.length || draft?.mode === DRAFT_MODE.create ? (
        <Tree
          blockNode
          showLine={true}
          draggable={draggable}
          treeData={model.treeData}
          expandedKeys={expandedKeys}
          selectedKeys={selectedId ? [selectedId] : []}
          onExpand={onExpand}
          switcherIcon={renderSwitcherIcon}
          onSelect={selectNode}
          titleRender={renderTitle}
          {...drag}
        />
      ) : (
        <p className="px-2 text-ui-sm text-fg-subtle">Nothing here yet. Create a folder or a doc.</p>
      )}
    </div>
  );
};
