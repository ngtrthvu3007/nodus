import { API_ROUTES } from "@/shared/constants";
import { httpClient } from "@/shared/libs/httpClient";
import type {
  AddMemberRequest,
  ChangeMemberRoleRequest,
  WorkspaceMember,
  WorkspaceNameRequest,
  WorkspaceSummary,
} from "@/shared/types";

// The list of workspaces comes with GET /me (getCurrentUser); these routes change them.
export const createWorkspace = (request: WorkspaceNameRequest) =>
  httpClient.post<WorkspaceSummary>(API_ROUTES.workspaces, request);

export const renameWorkspace = (workspaceId: string, request: WorkspaceNameRequest) =>
  httpClient.patch<WorkspaceSummary>(API_ROUTES.workspace(workspaceId), request);

// Deletes every folder, doc and link in the workspace too.
export const deleteWorkspace = (workspaceId: string) => httpClient.delete(API_ROUTES.workspace(workspaceId));

// signal: lets the client cancel the request; not an API parameter.
export const getMembers = (workspaceId: string, signal?: AbortSignal) =>
  httpClient.get<WorkspaceMember[]>(API_ROUTES.members(workspaceId), { signal });

export const addMember = (workspaceId: string, request: AddMemberRequest) =>
  httpClient.post<WorkspaceMember>(API_ROUTES.members(workspaceId), request);

export const changeMemberRole = (workspaceId: string, userId: string, request: ChangeMemberRoleRequest) =>
  httpClient.patch<WorkspaceMember>(API_ROUTES.member(workspaceId, userId), request);

// Removes a member, or leaves the workspace when userId is the signed-in user.
export const removeMember = (workspaceId: string, userId: string) =>
  httpClient.delete(API_ROUTES.member(workspaceId, userId));
