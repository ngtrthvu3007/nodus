export type WorkspaceRole = "owner" | "member";

// A workspace as one of its members sees it, with that member's role (GET /me, GET /workspaces).
export interface WorkspaceSummary {
  id: string;
  name: string;
  role: WorkspaceRole;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  role: WorkspaceRole;
}

// Create and rename take the same body.
export interface WorkspaceNameRequest {
  name: string;
}

export interface AddMemberRequest {
  email: string;
  role: WorkspaceRole;
}

export interface ChangeMemberRoleRequest {
  role: WorkspaceRole;
}
