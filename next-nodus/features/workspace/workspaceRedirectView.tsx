"use client";

import { Button, Empty, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PAGE_ROUTES } from "@/shared/constants";
import { CreateWorkspaceDialog } from "./components";
import { useCurrentWorkspace } from "./hooks";
import { getLastWorkspaceId } from "./lib/lastWorkspace";

// "/": opens the workspace used last, else the first one. Every account starts with a personal workspace, so the
// empty state only shows after the user left or deleted all of them.
export const WorkspaceRedirectView = () => {
  const router = useRouter();
  const { workspaces, isPending } = useCurrentWorkspace();
  const [isCreating, setIsCreating] = useState(false);

  const lastId = getLastWorkspaceId();
  const target = workspaces.find((workspace) => workspace.id === lastId) ?? workspaces.at(0);

  useEffect(() => {
    if (target) router.replace(PAGE_ROUTES.workspace(target.id));
  }, [target, router]);

  if (isPending || target) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <Empty description="You are not in any workspace." className="py-24">
      <Button type="primary" onClick={() => setIsCreating(true)}>
        New workspace
      </Button>
      <CreateWorkspaceDialog open={isCreating} onClose={() => setIsCreating(false)} />
    </Empty>
  );
};
