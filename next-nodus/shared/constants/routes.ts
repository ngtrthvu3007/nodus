import type { SearchDocsRequest } from "@/shared/types";
import type { NodeKind } from "./nodeKind";

export const API_ROUTES = {
  register: "/auth/register",
  login: "/auth/login",
  logout: "/auth/logout",
  currentUser: "/me",
  tokens: "/tokens",
  token: (id: string) => `/tokens/${id}`,

  workspaces: "/workspaces",
  workspace: (workspaceId: string) => `/workspaces/${workspaceId}`,
  members: (workspaceId: string) => `/workspaces/${workspaceId}/members`,
  member: (workspaceId: string, userId: string) => `/workspaces/${workspaceId}/members/${userId}`,

  tree: (workspaceId: string) => `/workspaces/${workspaceId}/tree`,

  folders: (workspaceId: string) => `/workspaces/${workspaceId}/folders`,
  folder: (id: string) => `/folders/${id}`,
  folderMove: (id: string) => `/folders/${id}/move`,
  folderExport: (id: string) => `/folders/${id}/export`,

  docs: (workspaceId: string) => `/workspaces/${workspaceId}/docs`,
  docSearch: (workspaceId: string, { query, offset }: SearchDocsRequest) =>
    `/workspaces/${workspaceId}/docs?${new URLSearchParams({ q: query, offset: String(offset) })}`,
  doc: (id: string) => `/docs/${id}`,
  docTitle: (id: string) => `/docs/${id}/title`,
  docMove: (id: string) => `/docs/${id}/move`,
  docExport: (id: string) => `/docs/${id}/export`,
  docsExport: (workspaceId: string) => `/workspaces/${workspaceId}/docs/export`,
  docsImport: (workspaceId: string) => `/workspaces/${workspaceId}/docs/import`,
  docLinks: (id: string) => `/docs/${id}/links`,
  docHeadings: (id: string) => `/docs/${id}/headings`,
  docAutocomplete: (workspaceId: string, query: string) =>
    `/workspaces/${workspaceId}/docs/autocomplete?q=${encodeURIComponent(query)}`,
};

const workspacePage = (workspaceId: string) => `/w/${workspaceId}`;

// Every page of a workspace carries its id in the URL, so a link always opens the right workspace.
const NODE_PAGES = {
  folder: (workspaceId: string, id: string) => `${workspacePage(workspaceId)}/folders/${id}`,
  doc: (workspaceId: string, id: string) => `${workspacePage(workspaceId)}/docs/${id}`,
} satisfies Record<NodeKind, (workspaceId: string, id: string) => string>;

export const PAGE_ROUTES = {
  // Sends the user on to a workspace of theirs (the last one opened, else the first).
  home: "/",
  login: "/login",
  register: "/register",
  tokens: "/settings/tokens",
  workspace: workspacePage,
  members: (workspaceId: string) => `${workspacePage(workspaceId)}/members`,
  ...NODE_PAGES,
  node: (workspaceId: string, kind: NodeKind, id: string) => NODE_PAGES[kind](workspaceId, id),
};
