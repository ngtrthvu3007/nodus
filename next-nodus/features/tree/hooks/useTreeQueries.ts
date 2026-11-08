import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createNode, deleteNode, getTree, moveNode, renameNode } from "@/api";
import { NODE_KIND, WORKSPACE_ID } from "@/shared/constants";

export const useTree = () =>
  useQuery({
    queryKey: ["tree", WORKSPACE_ID],
    queryFn: ({ signal }) => getTree(signal),
  });

// A tree change can also change a folder's children or a doc's prev/next.
const invalidateTree = (queryClient: QueryClient) =>
  Promise.all(
    ["tree", NODE_KIND.folder, NODE_KIND.doc].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );

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
