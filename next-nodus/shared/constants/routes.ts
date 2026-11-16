import type { SearchDocsRequest } from "@/shared/types";
import type { NodeKind } from "./nodeKind";

export const API_ROUTES = {
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
  docLinks: (id: string) => `/docs/${id}/links`,
  docHeadings: (id: string) => `/docs/${id}/headings`,
  docAutocomplete: (workspaceId: string, query: string) =>
    `/workspaces/${workspaceId}/docs/autocomplete?q=${encodeURIComponent(query)}`,
};

const NODE_PAGES = {
  folder: (id: string) => `/folders/${id}`,
  doc: (id: string) => `/docs/${id}`,
} satisfies Record<NodeKind, (id: string) => string>;

export const PAGE_ROUTES = {
  home: "/",
  ...NODE_PAGES,
  node: (kind: NodeKind, id: string) => NODE_PAGES[kind](id),
};
