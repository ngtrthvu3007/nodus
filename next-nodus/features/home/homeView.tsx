"use client";

import { Button, Skeleton } from "antd";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { NewNodeMenu, useTree, useTreeModel } from "@/features/tree";
import { LoadError } from "@/shared/components";
import { PAGE_ROUTES } from "@/shared/constants";

export const HomeView = () => {
  const router = useRouter();
  const { data, isPending, refetch } = useTree();
  const { firstDocId } = useTreeModel(data);

  if (isPending) return <Skeleton active className="mx-auto max-w-xl px-8 py-16" />;

  if (!data) return <LoadError title="Could not load the tree" onRetry={refetch} className="m-8" />;

  const openFirstDoc = (event: MouseEvent) => {
    event.preventDefault();
    if (firstDocId) router.push(PAGE_ROUTES.doc(firstDocId));
  };

  const isEmpty = data.length === 0;
  const title = isEmpty ? "Start writing" : "Select a doc";
  const hint = isEmpty
    ? "Create your first folder or doc."
    : "Pick a doc from the sidebar, or start with the first one.";

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-4 px-8 text-center">
      <h1 className="text-h2 font-semibold">{title}</h1>
      <p className="text-doc text-fg-muted">{hint}</p>
      {firstDocId && (
        <Button type="primary" href={PAGE_ROUTES.doc(firstDocId)} onClick={openFirstDoc}>
          Open the first doc
        </Button>
      )}
      {isEmpty && <NewNodeMenu parentId={null} type="primary" />}
    </div>
  );
};
