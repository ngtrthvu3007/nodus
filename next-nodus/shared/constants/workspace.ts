export const WORKSPACE_ROLE = {
  owner: "owner",
  member: "member",
} as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLE)[keyof typeof WORKSPACE_ROLE];

export const ROLE_LABEL = {
  owner: "Owner",
  member: "Member",
} satisfies Record<WorkspaceRole, string>;

// Same rule as the API: trimmed, 1-100 characters.
export const MAX_WORKSPACE_NAME_LENGTH = 100;
