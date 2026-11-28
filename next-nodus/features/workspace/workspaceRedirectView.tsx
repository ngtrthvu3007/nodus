"use client";

import { Button, Empty, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/features/auth";
import { PAGE_ROUTES } from "@/shared/constants";
import type { WorkspaceSummary } from "@/shared/types";
import { CreateWorkspaceDialog } from "./components";
import { getLastWorkspaceId } from "./lib/lastWorkspace";

const NO_WORKSPACES: WorkspaceSummary[] = [];

// "/": opens the workspace used last, else the first one. Login, register, deleting and leaving a workspace all come
// here without refreshing GET /me first, so it is fetched again on mount and nothing is decided until it returns:
// the cached list may still hold a deleted workspace, or (after login) no workspaces at all.
export const WorkspaceRedirectView = () => {
  const router = useRouter();
  const { data: user, isFetching } = useCurrentUser({ refetchOnMount: "always" });
  const [isCreating, setIsCreating] = useState(false);

  const workspaces = user?.workspaces ?? NO_WORKSPACES;
  const lastId = getLastWorkspaceId();
  const target = isFetching ? undefined : (workspaces.find((workspace) => workspace.id === lastId) ?? workspaces.at(0));

  useEffect(() => {
    if (target) router.replace(PAGE_ROUTES.workspace(target.id));
  }, [target, router]);

  if (isFetching || target) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin />
      </div>
    );
  }

  // Every account starts with a personal workspace: this shows only after the user left or deleted all of them.
  return (
    <Empty description="You are not in any workspace." className="py-24">
      <Button type="primary" onClick={() => setIsCreating(true)}>
        New workspace
      </Button>
      <CreateWorkspaceDialog open={isCreating} onClose={() => setIsCreating(false)} />
    </Empty>
  );
};
