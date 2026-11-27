"use client";

import { Button, Empty, Flex, Skeleton, Typography, type TooltipProps } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoadError } from "@/shared/components";
import { PAGE_ROUTES } from "@/shared/constants";
import type { DocSearchResult } from "@/shared/types";
import { useSearch } from "../hooks";

const { Text, Paragraph } = Typography;

// antd's `mark` is yellow and Typography has no slot to restyle it, so the parent recolors it with the shared tokens.
// `primary-soft` is nearly white on the light theme, so the match is the brand color at 20% and bold.
const MARK_CLASS = "[&_mark]:rounded-sm [&_mark]:bg-primary/20 [&_mark]:px-1 [&_mark]:font-semibold [&_mark]:text-fg";

// To the right, over the page: a tooltip above the row would cover the search box and the row before it.
const getTooltip = (title: string): TooltipProps => ({ title, placement: "right" });

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Splitting on a capture group puts every match at an odd index.
const Highlight = ({ text, keyword }: { text: string; keyword: string }) =>
  text.split(new RegExp(`(${escapeRegExp(keyword)})`, "i")).map((part, index) =>
    index % 2 ? (
      <Text key={index} mark className="[font-size:inherit]">
        {part}
      </Text>
    ) : (
      part
    ),
  );

type ResultItemProps = { doc: DocSearchResult; keyword: string; isActive: boolean; href: string };

// The doc on screen gets the same quiet mark as its row in the tree; the transparent border keeps rows from shifting.
const ResultItem = ({ doc, keyword, isActive, href }: ResultItemProps) => (
  <li>
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="block rounded-md border-l-2 border-transparent px-2 py-2 hover:bg-primary/10 focus-visible:bg-primary/10 aria-[current=page]:border-primary aria-[current=page]:bg-primary/15">
      <Flex vertical>
        {/* The tooltip appears only when the text is cut, and shows it whole. */}
        <Text strong ellipsis={{ tooltip: getTooltip(doc.title) }} className={`text-link ${MARK_CLASS}`}>
          <Highlight text={doc.title} keyword={keyword} />
        </Text>
        {Boolean(doc.path) && (
          <Text ellipsis={{ tooltip: getTooltip(doc.path) }} className="text-ui-sm text-fg-muted">
            {doc.path}
          </Text>
        )}
        <Paragraph ellipsis={{ rows: 2 }} className={`mb-0 text-ui-sm text-fg-muted ${MARK_CLASS}`}>
          <Highlight text={doc.snippet} keyword={keyword} />
        </Paragraph>
      </Flex>
    </Link>
  </li>
);

type SearchResultsProps = { input: string; onClear: () => void };

export const SearchResults = ({ input, onClear }: SearchResultsProps) => {
  // Doc and folder pages both name their segment `id`.
  const { id: activeId, workspaceId = "" } = useParams<{ id?: string; workspaceId?: string }>();
  // The API stores precomposed Vietnamese letters; text typed or pasted in decomposed form would match nothing.
  const keyword = input.trim().normalize("NFC");
  const { data, isPending, isError, refetch, isPlaceholderData, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSearch(keyword);

  if (isPending) return <Skeleton active title={false} paragraph={{ rows: 4 }} />;
  if (isError) return <LoadError title="Could not search" onRetry={refetch} />;

  if (!data.length) {
    return (
      <div role="status">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="wrap-break-word">No docs match &ldquo;{keyword}&rdquo;.</span>}>
          <Button size="small" onClick={onClear}>
            Clear search
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div aria-busy={isPlaceholderData} className={isPlaceholderData ? "opacity-60" : undefined}>
      <p role="status" className="sr-only">
        {data.length} {data.length === 1 ? "doc" : "docs"} found{hasNextPage ? ", more available" : ""}
      </p>
      <ul aria-label="Search results">
        {data.map((doc) => (
          <ResultItem
            key={doc.id}
            doc={doc}
            keyword={keyword}
            isActive={doc.id === activeId}
            href={PAGE_ROUTES.doc(workspaceId, doc.id)}
          />
        ))}
      </ul>
      {hasNextPage && (
        <Button block loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
          Load more
        </Button>
      )}
    </div>
  );
};
