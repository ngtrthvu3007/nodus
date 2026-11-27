import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { searchDocs } from "@/api";
import { useDebouncedValue, useWorkspaceId } from "@/shared/hooks";

export const SEARCH_KEY = "doc-search";
const SEARCH_DEBOUNCE_MS = 300;

// Mounted only while the box has text, so the keyword (trimmed, NFC) is never empty.
export const useSearch = (keyword: string) => {
  const query = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS);
  const workspaceId = useWorkspaceId();

  return useInfiniteQuery({
    queryKey: [SEARCH_KEY, workspaceId, query],
    queryFn: ({ pageParam, signal }) => searchDocs(workspaceId, { query, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (page) => (page.hasMore ? page.offset + page.items.length : undefined),
    // A doc edited between two pages moves to the top and can come back on the next page.
    select: (data) => [...new Map(data.pages.flatMap((page) => page.items).map((doc) => [doc.id, doc])).values()],
    placeholderData: keepPreviousData,
  });
};
