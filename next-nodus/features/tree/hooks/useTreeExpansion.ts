"use client";

import { useState, type Key } from "react";
import type { TreeModel } from "./useTreeModel";

type UseTreeExpansionInput = {
  model: TreeModel;
  selectedId: string | null;
  // A branch that must be open right now, e.g. the parent of the node being created.
  forcedOpenId: string | null;
};

export const useTreeExpansion = ({ model, selectedId, forcedOpenId }: UseTreeExpansionInput) => {
  const [openKeys, setOpenKeys] = useState<Key[] | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const getPathIds = (id: string) => model.getPath(id).map((node) => node.id);

  // A page opened from a link, breadcrumb or Next button opens the branches above it, once per page.
  const isNewPage = selectedId !== null && selectedId !== revealedId;

  if (isNewPage && model.nodesById.has(selectedId)) {
    setRevealedId(selectedId);

    if (openKeys) setOpenKeys([...openKeys, ...getPathIds(selectedId)]);
  }

  const forcedKeys = forcedOpenId ? getPathIds(forcedOpenId) : [];
  const expandedKeys = [...new Set([...(openKeys ?? model.parentIds), ...forcedKeys])];

  const expand = (id: string) => setOpenKeys([...expandedKeys, id]);

  return { expandedKeys, onExpand: (keys: Key[]) => setOpenKeys(keys), expand };
};
