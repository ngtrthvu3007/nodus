import type { WorkspaceRole } from "@/shared/types";

export const WORKSPACE_ROLE = {
  owner: "owner",
  member: "member",
} as const satisfies Record<string, WorkspaceRole>;

export const ROLE_LABEL = {
  owner: "Owner",
  member: "Member",
} satisfies Record<WorkspaceRole, string>;

// For the role pickers of the members page (add a member, change a role).
export const ROLE_OPTIONS = Object.values(WORKSPACE_ROLE).map((role) => ({ value: role, label: ROLE_LABEL[role] }));

// Same rule as the API: trimmed, 1-100 characters.
export const MAX_WORKSPACE_NAME_LENGTH = 100;
