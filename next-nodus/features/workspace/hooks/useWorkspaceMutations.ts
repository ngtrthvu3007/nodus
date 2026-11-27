import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWorkspace, deleteWorkspace, renameWorkspace } from "@/api";
import { CURRENT_USER_KEY } from "@/features/auth";
import type { WorkspaceNameRequest } from "@/shared/types";

// The list of workspaces lives in GET /me, so every change asks for it again.
const useRefreshWorkspaces = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
};

export const useCreateWorkspace = () => {
  const refreshWorkspaces = useRefreshWorkspaces();
  return useMutation({ mutationFn: createWorkspace, onSuccess: refreshWorkspaces });
};

export const useRenameWorkspace = (workspaceId: string) => {
  const refreshWorkspaces = useRefreshWorkspaces();

  return useMutation({
    mutationFn: (request: WorkspaceNameRequest) => renameWorkspace(workspaceId, request),
    onSuccess: refreshWorkspaces,
  });
};

export const useDeleteWorkspace = (workspaceId: string) => {
  const refreshWorkspaces = useRefreshWorkspaces();
  return useMutation({ mutationFn: () => deleteWorkspace(workspaceId), onSuccess: refreshWorkspaces });
};
