import { useCurrentUser } from "@/features/auth";
import { WORKSPACE_ROLE } from "@/shared/constants";
import { useWorkspaceId } from "@/shared/hooks";
import type { WorkspaceSummary } from "@/shared/types";

const NO_WORKSPACES: WorkspaceSummary[] = [];

// The user's workspaces (from GET /me) and the one in the URL; current is undefined outside a workspace page and for
// a workspace the user is not a member of.
export const useCurrentWorkspace = () => {
  const workspaceId = useWorkspaceId();
  const { data: user, isPending } = useCurrentUser();
  const workspaces = user?.workspaces ?? NO_WORKSPACES;
  const current = workspaces.find((workspace) => workspace.id === workspaceId);

  return {
    workspaceId,
    workspaces,
    current,
    isOwner: current?.role === WORKSPACE_ROLE.owner,
    userId: user?.id,
    isPending,
  };
};
