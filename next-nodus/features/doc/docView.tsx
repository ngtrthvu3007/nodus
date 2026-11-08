"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { Result, Skeleton } from "antd";
import Link from "next/link";
import { use } from "react";
import { NodeBreadcrumb } from "@/features/tree";
import { LoadError } from "@/shared/components";
import { PAGE_ROUTES } from "@/shared/constants";
import { ApiError } from "@/shared/libs/httpClient";
import type { DocDetail, DocRef } from "@/shared/types";
import { useDoc } from "./hooks";

const CARD_CLASS =
  "flex min-w-0 flex-col gap-1 rounded-md border border-border-muted bg-surface px-4 py-3 " +
  "hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// The arrow sits before the label for "Previous" and after it for "Next".
const SIDES = {
  prev: { label: "Previous", Arrow: ArrowLeftIcon, cardClass: "items-start text-left", labelClass: "" },
  next: { label: "Next", Arrow: ArrowRightIcon, cardClass: "items-end text-right", labelClass: "flex-row-reverse" },
};

type DocNeighborLinkProps = {
  doc: DocRef | null;
  direction: keyof typeof SIDES;
};

const DocNeighborLink = ({ doc, direction }: DocNeighborLinkProps) => {
  // Keeps the other card in its column when there is no previous or next doc.
  if (!doc) return <div />;

  const { label, Arrow, cardClass, labelClass } = SIDES[direction];

  return (
    <Link href={PAGE_ROUTES.doc(doc.id)} className={`${CARD_CLASS} ${cardClass}`}>
      <span className={`flex items-center gap-1 text-ui-sm text-fg-subtle ${labelClass}`}>
        <Arrow className="size-3" />
        {label}
      </span>
      <span className="w-full truncate text-ui text-fg">{doc.title}</span>
    </Link>
  );
};

const DocContent = ({ doc }: { doc: DocDetail }) => {
  const bodyClass = doc.content ? "" : "text-fg-subtle";

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <NodeBreadcrumb id={doc.id} />

      <h1 className="mt-4 text-h1 font-semibold">{doc.title}</h1>

      <div className={`mt-6 whitespace-pre-wrap text-doc ${bodyClass}`}>
        {doc.content || "This doc has no content yet."}
      </div>

      <nav aria-label="Document navigation" className="mt-10 grid grid-cols-2 gap-4 border-t border-border-muted pt-6">
        <DocNeighborLink doc={doc.prev} direction="prev" />
        <DocNeighborLink doc={doc.next} direction="next" />
      </nav>
    </div>
  );
};

type DocViewProps = { params: Promise<{ id: string }> };

export const DocView = ({ params }: DocViewProps) => {
  const { id } = use(params);
  const { data, isPending, error, refetch } = useDoc(id);

  if (isPending && !error) return <Skeleton active className="mx-auto max-w-3xl px-8 py-10" />;

  if (error instanceof ApiError && error.status === 404) {
    return <Result status="404" title="Doc not found" subTitle="This doc does not exist or was deleted." />;
  }

  if (!data) return <LoadError title="Could not load the doc" onRetry={refetch} className="m-8" />;

  return <DocContent doc={data} />;
};
