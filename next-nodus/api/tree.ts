import { API_ROUTES, WORKSPACE_ID } from "@/shared/constants";
import { httpClient } from "@/shared/libs/httpClient";
import type { TreeNode } from "@/shared/types";

// signal: lets the client cancel the request; not an API parameter.
export const getTree = (signal?: AbortSignal) => httpClient.get<TreeNode[]>(API_ROUTES.tree(WORKSPACE_ID), { signal });
