"use client";

import { FilePlusIcon, FolderPlusIcon, PlusIcon } from "lucide-react";
import { Breadcrumb, Button, Dropdown, type ButtonProps } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import { NODE_KIND, PAGE_ROUTES, type NodeKind } from "@/shared/constants";
import { useTreeDraftStore } from "@/shared/stores";
import { useTree, useTreeModel } from "../hooks";

const NEW_ITEMS: { kind: NodeKind; label: string; icon: ReactNode }[] = [
  { kind: NODE_KIND.doc, label: "New doc", icon: <FilePlusIcon className="size-4" /> },
  { kind: NODE_KIND.folder, label: "New folder", icon: <FolderPlusIcon className="size-4" /> },
];

type NewNodeMenuProps = {
  // Where the new node goes; null = workspace root.
  parentId: string | null;
  type?: ButtonProps["type"];
  size?: ButtonProps["size"];
  block?: boolean;
};

export const NewNodeMenu = ({ parentId, type, size = "small", block }: NewNodeMenuProps) => {
  const startCreate = useTreeDraftStore((state) => state.startCreate);

  const items = NEW_ITEMS.map(({ kind, label, icon }) => ({
    key: kind,
    label,
    icon,
    onClick: () => startCreate(kind, parentId),
  }));

  return (
    <Dropdown trigger={["click"]} menu={{ items }}>
      <Button size={size} type={type} block={block} icon={<PlusIcon className="size-4" />}>
        New
      </Button>
    </Dropdown>
  );
};

// The ancestors only: the screen's own title already names the current node. Names come from the tree, so a
// rename shows up at once.
export const NodeBreadcrumb = ({ id }: { id: string }) => {
  const { data } = useTree();
  const { getPath } = useTreeModel(data);
  const path = getPath(id);
  const current = path.at(-1);

  if (!current) return null;

  const parentItems = path.slice(0, -1).map((node) => ({
    title: <Link href={PAGE_ROUTES.node(node.kind, node.id)}>{node.name}</Link>,
  }));

  const workspaceItem = { title: <Link href={PAGE_ROUTES.home}>Workspace</Link> };
  const items = [workspaceItem, ...parentItems];

  return <Breadcrumb items={items} classNames={{ root: "text-ui-sm [&_a]:text-fg-muted [&_a:hover]:text-primary [&_li]:text-fg-muted" }} />;
};
