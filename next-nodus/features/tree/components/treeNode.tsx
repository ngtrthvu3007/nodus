"use client";

import { DocumentTextIcon, FolderIcon } from "@heroicons/react/20/solid";
import { DocumentPlusIcon, EllipsisHorizontalIcon, FolderOpenIcon, FolderPlusIcon } from "@heroicons/react/24/outline";
import { Button, Dropdown, Input, type MenuProps } from "antd";
import { NODE_KIND, NODE_LABEL, type NodeKind } from "@/shared/constants";
import { DRAFT_MODE, useTreeDraftStore } from "@/shared/stores";
import type { TreeNode } from "@/shared/types";
import { useNodeNameInput, type TreeActions } from "../hooks";

type NodeIconProps = {
  kind: NodeKind;
  expanded?: boolean;
  className?: string;
};

// Closed folders are filled, open ones are outlined, so the open branch stands out; docs stay a quiet gray.
export const NodeIcon = ({ kind, expanded = false, className = "size-5" }: NodeIconProps) => {
  if (kind === NODE_KIND.doc) return <DocumentTextIcon className={`shrink-0 text-fg-subtle ${className}`} />;

  const Icon = expanded ? FolderOpenIcon : FolderIcon;
  return <Icon className={`shrink-0 text-primary ${className}`} />;
};

type NodeNameInputProps = {
  kind: NodeKind;
  initialName: string;
  onSubmit: (name: string) => Promise<boolean>;
  onCancel: () => void;
};

export const NodeNameInput = ({ kind, initialName, onSubmit, onCancel }: NodeNameInputProps) => {
  const { inputRef, value, error, saving, onChange, onKeyDown } = useNodeNameInput({
    initialName,
    onSubmit,
    onCancel,
  });
  const label = `${NODE_LABEL[kind]} name`;

  return (
    <span className="flex min-w-0 flex-col gap-1" onClick={(event) => event.stopPropagation()}>
      <span className="flex items-center gap-2">
        <NodeIcon kind={kind} />
        <Input
          ref={inputRef}
          size="small"
          value={value}
          disabled={saving}
          status={error ? "error" : undefined}
          placeholder={label}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </span>
      {error && (
        <span role="alert" className="text-ui-sm text-error">
          {error}
        </span>
      )}
    </span>
  );
};

const getMenu = (node: TreeNode, { openCreate, openRename, confirmDelete }: TreeActions): MenuProps => {
  const newFolder = {
    key: "create-folder",
    label: "New folder",
    icon: <FolderPlusIcon className="size-4" />,
    onClick: () => openCreate(NODE_KIND.folder, node.id),
  };

  const newDoc = {
    key: "create-doc",
    label: node.kind === NODE_KIND.folder ? "New doc" : "New child doc",
    icon: <DocumentPlusIcon className="size-4" />,
    onClick: () => openCreate(NODE_KIND.doc, node.id),
  };

  const rename = { key: "rename", label: "Rename", onClick: () => openRename(node) };

  const remove = { key: "delete", label: "Delete", danger: true, onClick: () => confirmDelete(node) };

  return {
    items: [...(node.kind === NODE_KIND.folder ? [newFolder] : []), newDoc, { type: "divider" as const }, rename, remove],
    onClick: ({ domEvent }) => domEvent.stopPropagation(),
  };
};

type TreeNodeTitleProps = {
  node: TreeNode;
  expanded: boolean;
  actions: TreeActions;
  onRename: (name: string) => Promise<boolean>;
};

export const TreeNodeTitle = ({ node, expanded, actions, onRename }: TreeNodeTitleProps) => {
  const isRenaming = useTreeDraftStore(
    (state) => state.draft?.mode === DRAFT_MODE.rename && state.draft.nodeId === node.id,
  );
  const clearDraft = useTreeDraftStore((state) => state.clearDraft);

  if (isRenaming) {
    return <NodeNameInput kind={node.kind} initialName={node.name} onSubmit={onRename} onCancel={clearDraft} />;
  }

  const menu = getMenu(node, actions);

  return (
    <Dropdown menu={menu} trigger={["contextMenu"]}>
      <span className="group flex min-w-0 items-center gap-2">
        <NodeIcon kind={node.kind} expanded={expanded} />

        <span className="min-w-0 flex-1 truncate">{node.name}</span>

        <Dropdown menu={menu} trigger={["click"]}>
          <Button
            size="small"
            type="text"
            aria-label="Actions"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            icon={<EllipsisHorizontalIcon className="size-4" />}
            onClick={(event) => event.stopPropagation()}
          />
        </Dropdown>
      </span>
    </Dropdown>
  );
};
