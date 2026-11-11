"use client";

import { Tabs } from "antd";
import { NodeIcon } from "@/features/tree";
import { useSidebarStore } from "@/shared/stores";
import type { TreeNode } from "@/shared/types";
import { useTabs } from "./hooks";

// The icon tells a folder from a doc at a glance; a long title is cut, and the full one shows on hover.
const TabLabel = ({ kind, name }: Pick<TreeNode, "kind" | "name">) => (
  <span className="flex max-w-44 items-center gap-1.5" title={name}>
    <NodeIcon kind={kind} className="size-4" />
    <span className="truncate">{name}</span>
  </span>
);

// Above the page content. While the sidebar is closed its open button floats over the left corner, so the bar makes room.
// The header has no bottom margin: antd adds one for tab panels, and these tabs have none.
export const TabBar = () => {
  const { tabNodes, activeId, select, close } = useTabs();
  const isSidebarCollapsed = useSidebarStore((state) => state.width === 0);

  // One open doc needs no bar: it would only repeat the title right below it.
  if (tabNodes.length < 2) return null;

  return (
    <Tabs
      type="editable-card"
      size="small"
      hideAdd
      activeKey={activeId}
      items={tabNodes.map(({ id, kind, name }) => ({ key: id, label: <TabLabel kind={kind} name={name} /> }))}
      onChange={select}
      onEdit={(key, action) => {
        if (action === "remove" && typeof key === "string") close(key);
      }}
      classNames={{
        root: `nodus-tab-bar shrink-0 bg-canvas pt-2 ${activeId === undefined ? "nodus-tab-bar-idle" : ""}`,
        header: "mb-0",
      }}
      className={`border-b border-border-muted pr-2 transition-[padding] duration-300 ${
        isSidebarCollapsed ? "pl-14" : "pl-2"
      }`}
    />
  );
};
