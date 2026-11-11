"use client";

import { Skeleton } from "antd";
import { useEffect, useRef } from "react";
import { LoadError } from "@/shared/components";
import { useMarkdownClicks, useMarkdownEnhance, useMarkdownHtml } from "./hooks";
import type { OutlineItem } from "./lib/headings";

type MarkdownProps = {
  source: string;
  // The h2-h3 headings of the rendered text, for MarkdownOutline.
  onOutlineChange?: (outline: OutlineItem[]) => void;
};

export const Markdown = ({ source, onOutlineChange }: MarkdownProps) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const { rendered, failed, retry } = useMarkdownHtml(source);
  const { onClick, zoomModal } = useMarkdownClicks();
  useMarkdownEnhance(bodyRef, rendered?.html);

  const outline = rendered?.outline;
  useEffect(() => {
    onOutlineChange?.(outline ?? []);
  }, [outline, onOutlineChange]);

  if (failed) return <LoadError title="Could not render the preview" onRetry={retry} />;

  if (!rendered) return <Skeleton active title={false} paragraph={{ rows: 3 }} />;

  return (
    <>
      {/* The HTML is built and filtered by renderMarkdown (allowlist), never taken from the user as is. */}
      <div
        ref={bodyRef}
        onClick={onClick}
        className="markdown-body text-doc"
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />

      {zoomModal}
    </>
  );
};
