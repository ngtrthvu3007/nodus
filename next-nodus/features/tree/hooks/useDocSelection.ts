"use client";
import { useState } from "react";
import { NODE_KIND } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import { useExportDocs, useExportNode } from "./useTreeQueries";

// Selection mode of the sidebar: pick docs (in the order they are clicked), then download them as one flat zip, or as
// the .md file itself when only one is picked.
export const useDocSelection = () => {
  const toast = useToast();
  const exportDocs = useExportDocs();
  const exportNode = useExportNode();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const start = () => setIsSelecting(true);

  const cancel = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const toggle = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id]));

  const exportSelected = () => {
    const callbacks = { onSuccess: cancel, onError: (error: unknown) => toast.error(error) };

    if (selectedIds.length === 1) exportNode.mutate({ kind: NODE_KIND.doc, id: selectedIds[0] }, callbacks);
    else exportDocs.mutate({ ids: selectedIds }, callbacks);
  };

  return {
    isSelecting,
    selectedIds,
    isExporting: exportDocs.isPending || exportNode.isPending,
    start,
    cancel,
    toggle,
    exportSelected,
  };
};
