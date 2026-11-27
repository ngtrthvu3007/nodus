import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMember, changeMemberRole, getMembers, removeMember } from "@/api";
import { CURRENT_USER_KEY } from "@/features/auth";
import type { AddMemberRequest, WorkspaceRole } from "@/shared/types";

export const MEMBERS_KEY = "members";

export const useMembers = (workspaceId: string) =>
  useQuery({
    queryKey: [MEMBERS_KEY, workspaceId],
    queryFn: ({ signal }) => getMembers(workspaceId, signal),
  });

// A member change can change the signed-in user's own role (or remove them), which GET /me holds.
const useRefreshMembers = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY, workspaceId] }),
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY }),
    ]);
};

export const useAddMember = (workspaceId: string) => {
  const refreshMembers = useRefreshMembers(workspaceId);

  return useMutation({
    mutationFn: (request: AddMemberRequest) => addMember(workspaceId, request),
    onSuccess: refreshMembers,
  });
};

export const useChangeMemberRole = (workspaceId: string) => {
  const refreshMembers = useRefreshMembers(workspaceId);

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      changeMemberRole(workspaceId, userId, { role }),
    onSuccess: refreshMembers,
  });
};

// Also how a member leaves: removing their own user id.
export const useRemoveMember = (workspaceId: string) => {
  const refreshMembers = useRefreshMembers(workspaceId);
  return useMutation({ mutationFn: (userId: string) => removeMember(workspaceId, userId), onSuccess: refreshMembers });
};
