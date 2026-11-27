"use client";

import { useParams } from "next/navigation";

// The workspace of the current URL (/w/[workspaceId]/…); an empty string outside a workspace page.
export const useWorkspaceId = (): string => useParams<{ workspaceId?: string }>().workspaceId ?? "";
