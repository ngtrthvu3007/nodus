import { useIsMutating, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createNode, deleteNode, exportDocs, exportNode, getTree, importDocs, moveNode, renameNode } from "@/api";
import { DOC_HEADINGS_KEY, DOC_LINKS_KEY } from "@/features/link";
import { SEARCH_KEY } from "@/features/search";
import { NODE_KIND, WORKSPACE_ID } from "@/shared/constants";
import { saveFile } from "@/shared/libs/saveFile";

export const useTree = () =>
  useQuery({
    queryKey: ["tree", WORKSPACE_ID],
    queryFn: ({ signal }) => getTree(signal),
    // Docs deleted or renamed elsewhere (another tab, MCP, a teammate) reach the sidebar and the tabs on return.
    refetchOnWindowFocus: true,
  });

const TREE_QUERY_KEYS = ["tree", NODE_KIND.folder, NODE_KIND.doc, DOC_LINKS_KEY, DOC_HEADINGS_KEY, SEARCH_KEY];

// A tree change can also change a folder's children, a doc's prev/next, which wiki-links resolve, and search results.
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

// An export changes nothing on the server, so nothing is invalidated: the file goes straight to the browser.
export const useExportNode = () => useMutation({ mutationFn: exportNode, onSuccess: saveFile });

export const useExportDocs = () => useMutation({ mutationFn: exportDocs, onSuccess: saveFile });

const IMPORT_MUTATION_KEY = ["import-docs"];

export const useImportDocs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: IMPORT_MUTATION_KEY,
    mutationFn: importDocs,
    onSuccess: () => invalidateTree(queryClient),
  });
};

// An import in flight, wherever it was started (a sidebar menu, a folder page): every New button shows it.
export const useIsImporting = () => useIsMutating({ mutationKey: IMPORT_MUTATION_KEY }) > 0;

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
