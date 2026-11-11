import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createNode, deleteNode, getTree, moveNode, renameNode } from "@/api";
import { DOC_HEADINGS_KEY, DOC_LINKS_KEY } from "@/features/link";
import { NODE_KIND, WORKSPACE_ID } from "@/shared/constants";

export const useTree = () =>
  useQuery({
    queryKey: ["tree", WORKSPACE_ID],
    queryFn: ({ signal }) => getTree(signal),
    // Docs deleted or renamed elsewhere (another tab, MCP, a teammate) reach the sidebar and the tabs on return.
    refetchOnWindowFocus: true,
  });

const TREE_QUERY_KEYS = ["tree", NODE_KIND.folder, NODE_KIND.doc, DOC_LINKS_KEY, DOC_HEADINGS_KEY];

// A tree change can also change a folder's children, a doc's prev/next, and which wiki-links resolve.
const invalidateTree = (queryClient: QueryClient) =>
  Promise.all(TREE_QUERY_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));

export const useCreateNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNode,
    onSuccess: () => invalidateTree(queryClient),
  });
};

export const useRenameNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: renameNode,
    onSuccess: () => invalidateTree(queryClient),
  });
};

export const useMoveNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: moveNode,
    onSuccess: () => invalidateTree(queryClient),
  });
};

export const useDeleteNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNode,
    onSuccess: (_result, { kind, id }) => {
      queryClient.removeQueries({ queryKey: [kind, id] });
      return invalidateTree(queryClient);
    },
  });
};
