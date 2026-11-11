import { httpClient } from "@/shared/libs/httpClient";
import type { DocHeading, DocLinks, DocSuggestion } from "@/shared/types";
import { API_ROUTES, WORKSPACE_ID } from "@/shared/constants";

export const getDocLinks = (id: string, signal?: AbortSignal) =>
  httpClient.get<DocLinks>(API_ROUTES.docLinks(id), { signal });

export const getDocHeadings = (id: string, signal?: AbortSignal) =>
  httpClient.get<DocHeading[]>(API_ROUTES.docHeadings(id), { signal });

export const suggestDocs = (query: string) =>
  httpClient.get<DocSuggestion[]>(API_ROUTES.docAutocomplete(WORKSPACE_ID, query));
