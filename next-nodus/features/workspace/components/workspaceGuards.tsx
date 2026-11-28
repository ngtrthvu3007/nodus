"use client";

import { Button, Result } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import { PAGE_ROUTES } from "@/shared/constants";
import { useCurrentWorkspace, useRememberLastWorkspace } from "../hooks";

// The sidebar tree and the tabs belong to one workspace: shown only on a page of a workspace the user is in.
export const WorkspaceOnly = ({ children }: { children: ReactNode }) => {
  const { current } = useCurrentWorkspace();
  return current ? children : null;
};

// A workspace page for a workspace the user is not in (removed, deleted, or someone else's link) says so, instead of
// every panel failing on its own. Pages outside a workspace (settings) pass through.
// It wraps every page, so it is also where the workspace on screen is remembered for "/".
export const WorkspacePageGate = ({ children }: { children: ReactNode }) => {
  const { workspaceId, current } = useCurrentWorkspace();
  useRememberLastWorkspace();

  if (!workspaceId || current) return children;

  return (
    <Result
      status="404"
      title="Workspace not found"
      subTitle="It does not exist, or you are not a member of it."
      extra={
        <Link href={PAGE_ROUTES.home}>
          <Button type="primary">Go to my workspaces</Button>
        </Link>
      }
    />
  );
};
