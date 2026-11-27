import { API_ROUTES } from "@/shared/constants";
import { httpClient } from "@/shared/libs/httpClient";
import type { TreeNode } from "@/shared/types";

// signal: lets the client cancel the request; not an API parameter.
export const getTree = (workspaceId: string, signal?: AbortSignal) =>
  httpClient.get<TreeNode[]>(API_ROUTES.tree(workspaceId), { signal });
