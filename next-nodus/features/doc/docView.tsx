"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Result, Skeleton } from "antd";
import Link from "next/link";
import { use, useRef, useState } from "react";
import type { MarkdownEditorHandle } from "@/features/editor";
import { NodeBreadcrumb } from "@/features/tree";
import { LoadError } from "@/shared/components";
import { PAGE_ROUTES } from "@/shared/constants";
import { ApiError } from "@/shared/libs/httpClient";
import { useSidebarStore } from "@/shared/stores";
import type { DocDetail, DocRef } from "@/shared/types";
import { ConflictDialog, DocWorkspace, SaveIndicator } from "./components";
import { useAutosave, useDoc } from "./hooks";

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

// The screen is as tall as the window: title on top, editor and preview below, each scrolling on its own.
const DocContent = ({ doc }: { doc: DocDetail }) => {
  // The text being edited, for the preview; useAutosave keeps its own copy to save.
  const [content, setContent] = useState(doc.content);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const autosave = useAutosave({ doc });

  const handleChange = (text: string) => {
    setContent(text);
    autosave.change(text);
  };
  // The button that opens a collapsed sidebar floats over the top left corner; the header makes room for it.
  const isSidebarCollapsed = useSidebarStore((state) => state.width === 0);

  const neighbors = (
    <nav aria-label="Document navigation" className="mt-10 grid grid-cols-2 gap-4 border-t border-border-muted pt-6">
      <DocNeighborLink doc={doc.prev} direction="prev" />
      <DocNeighborLink doc={doc.next} direction="next" />
    </nav>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header
        className={`shrink-0 bg-surface pt-5 pr-8 pb-4 transition-[padding] duration-300 motion-reduce:transition-none ${
          isSidebarCollapsed ? "pl-16" : "pl-8"
        }`}>
        <NodeBreadcrumb id={doc.id} />
        <h1 title={doc.title} className="mt-1 truncate text-h2 leading-tight font-semibold">
          {doc.title}
        </h1>
      </header>

      <DocWorkspace
        docId={doc.id}
        title={doc.title}
        content={content}
        onChange={handleChange}
        editorRef={editorRef}
        saveIndicator={<SaveIndicator status={autosave.status} nextSaveAt={autosave.nextSaveAt} />}
        footer={neighbors}
      />

      <ConflictDialog
        conflict={autosave.conflict}
        content={content}
        onKeepMine={autosave.keepMine}
        onTakeServer={() => autosave.takeServer((text) => editorRef.current?.replaceText(text))}
      />
    </div>
  );
};

type DocViewProps = { params: Promise<{ id: string }> };

export const DocView = ({ params }: DocViewProps) => {
  const { id } = use(params);
  const { data, isPending, error, refetch } = useDoc(id);

  if (isPending && !error) return <Skeleton active className="mx-auto max-w-3xl px-8 py-10" />;

  // With data, a refetch that fails with 404 must not replace the editor: its unsaved text would be lost.
  if (!data && error instanceof ApiError && error.status === 404) {
    return <Result status="404" title="Doc not found" subTitle="This doc does not exist or was deleted." />;
  }

  if (!data) return <LoadError title="Could not load the doc" onRetry={refetch} className="m-8" />;

  return <DocContent key={data.id} doc={data} />;
};
