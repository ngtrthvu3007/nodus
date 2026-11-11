"use client";

import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { getDocHeadings } from "@/api";
import { slugify } from "@/features/editor";

export const DOC_HEADINGS_KEY = "doc-headings";

type HeadingSlugs = { docId: string; slugs: string[] };

// Module level, so the Map is only rebuilt when a query result changes.
const combineSlugs = (results: UseQueryResult<HeadingSlugs>[]) =>
  new Map(results.flatMap(({ data }) => (data ? [[data.docId, new Set(data.slugs)] as const] : [])));

// The heading slugs of each doc, once loaded; a doc still loading is not in the Map.
export const useHeadingSlugs = (docIds: string[]) =>
  useQueries({
    queries: docIds.map((docId) => ({
      queryKey: [DOC_HEADINGS_KEY, docId],
      queryFn: async ({ signal }: { signal: AbortSignal }): Promise<HeadingSlugs> => {
        const headings = await getDocHeadings(docId, signal);
        return { docId, slugs: headings.map(({ text }) => slugify(text)) };
      },
    })),
    combine: combineSlugs,
  });
