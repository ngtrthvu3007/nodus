"use client";

import { Empty, Result, Skeleton } from "antd";
import Link from "next/link";
import { use } from "react";
import { NewNodeMenu, NodeBreadcrumb, NodeIcon } from "@/features/tree";
import { LoadError } from "@/shared/components";
import { NODE_KIND, NODE_LABEL, PAGE_ROUTES } from "@/shared/constants";
import { ApiError } from "@/shared/libs/httpClient";
import type { FolderChild, FolderDetail } from "@/shared/types";
import { FolderDescription } from "./folderDescription";
import { useFolder } from "./hooks";

const ROW_CLASS =
  "flex items-center gap-3 px-4 py-2 text-ui hover:bg-fill " +
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

const FolderChildRow = ({ item }: { item: FolderChild }) => (
  <Link href={PAGE_ROUTES.node(item.kind, item.id)} className={ROW_CLASS}>
    <NodeIcon kind={item.kind} />
    <span className="min-w-0 flex-1 truncate">{item.name}</span>
    <span className="text-ui-sm text-fg-subtle">{NODE_LABEL[item.kind]}</span>
  </Link>
);

type FolderChildrenProps = {
  folderId: string;
  items: FolderChild[];
};

const FolderChildren = ({ folderId, items }: FolderChildrenProps) => {
  if (!items.length) {
    return (
      <Empty description="This folder is empty" className="py-10">
        <div className="flex justify-center">
          <NewNodeMenu parentId={folderId} type="primary" />
        </div>
      </Empty>
    );
  }

  const rows = items.map((item) => (
    <li key={item.id}>
      <FolderChildRow item={item} />
    </li>
  ));

  return <ul className="divide-y divide-border-muted">{rows}</ul>;
};

const FolderContents = ({ folder }: { folder: FolderDetail }) => {
  const hasChildren = folder.children.length > 0;

  return (
    <section className="mt-8 overflow-hidden rounded-md border border-border bg-surface">
      <header className="flex items-center justify-between gap-4 border-b border-border-muted px-4 py-2">
        <h2 className="text-ui-sm font-semibold uppercase tracking-wide text-fg-muted">
          Contents <span className="text-fg-subtle">({folder.children.length})</span>
        </h2>
        {hasChildren && <NewNodeMenu parentId={folder.id} />}
      </header>
      <FolderChildren folderId={folder.id} items={folder.children} />
    </section>
  );
};

const FolderContent = ({ folder }: { folder: FolderDetail }) => (
  <div className="mx-auto max-w-3xl px-8 py-10">
    <NodeBreadcrumb id={folder.id} />

    <h1 className="mt-4 flex items-center gap-3 text-h1 font-semibold">
      <NodeIcon kind={NODE_KIND.folder} className="size-7" />
      <span className="min-w-0 truncate">{folder.name}</span>
    </h1>

    <FolderDescription key={folder.description} folderId={folder.id} description={folder.description} />

    <FolderContents folder={folder} />
  </div>
);

type FolderViewProps = { params: Promise<{ id: string }> };

export const FolderView = ({ params }: FolderViewProps) => {
  const { id } = use(params);
  const { data, isPending, error, refetch } = useFolder(id);

  if (isPending && !error) return <Skeleton active className="mx-auto max-w-3xl px-8 py-10" />;

  if (error instanceof ApiError && error.status === 404) {
    return <Result status="404" title="Folder not found" subTitle="This folder does not exist or was deleted." />;
  }

  if (!data) return <LoadError title="Could not load the folder" onRetry={refetch} className="m-8" />;

  return <FolderContent folder={data} />;
};
