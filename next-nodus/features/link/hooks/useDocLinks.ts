import { useQuery } from "@tanstack/react-query";
import { getDocLinks } from "@/api";

export const DOC_LINKS_KEY = "doc-links";

export const useDocLinks = (docId: string) =>
  useQuery({
    queryKey: [DOC_LINKS_KEY, docId],
    queryFn: ({ signal }) => getDocLinks(docId, signal),
  });
