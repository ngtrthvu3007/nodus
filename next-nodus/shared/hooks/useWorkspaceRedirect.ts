"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWorkspaceId } from "./useWorkspaceId";

// A doc or folder opened under another workspace's URL (an old or copied link) moves to its own workspace's URL.
// The API answered, so the user is a member of that workspace. Returns true until the URL is right.
export const useWorkspaceRedirect = (nodeWorkspaceId: string | undefined, buildHref: (workspaceId: string) => string) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const isWrongWorkspace = nodeWorkspaceId !== undefined && nodeWorkspaceId !== workspaceId;

  useEffect(() => {
    if (isWrongWorkspace) router.replace(buildHref(nodeWorkspaceId));
  }, [isWrongWorkspace, nodeWorkspaceId, buildHref, router]);

  return isWrongWorkspace;
};
