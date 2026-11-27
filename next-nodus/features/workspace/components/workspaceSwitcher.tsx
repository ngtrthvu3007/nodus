"use client";

import { CheckIcon, ChevronsUpDownIcon, KeyRoundIcon, PlusIcon, UsersIcon } from "lucide-react";
import { Button, Dropdown, type MenuProps } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PAGE_ROUTES } from "@/shared/constants";
import { useCurrentWorkspace } from "../hooks";
import { setLastWorkspaceId } from "../lib/lastWorkspace";
import { CreateWorkspaceDialog } from "./createWorkspaceDialog";

const ACTION = {
  create: "create",
  members: "members",
  tokens: "tokens",
} as const;

const ICON_CLASS = "size-4";

// Top of the sidebar: the current workspace, the user's other workspaces, a new workspace, members and tokens.
export const WorkspaceSwitcher = () => {
  const router = useRouter();
  const { workspaceId, workspaces, current } = useCurrentWorkspace();
  const [isCreating, setIsCreating] = useState(false);

  // "/" sends the user back to the workspace they were in last.
  useEffect(() => {
    if (current) setLastWorkspaceId(current.id);
  }, [current]);

  const workspaceItems: MenuProps["items"] = workspaces.map((workspace) => ({
    key: workspace.id,
    label: <span className="block max-w-56 truncate">{workspace.name}</span>,
    icon: <CheckIcon className={`${ICON_CLASS} ${workspace.id === workspaceId ? "" : "invisible"}`} />,
  }));

  const items: MenuProps["items"] = [
    { type: "group", label: "Workspaces", children: workspaceItems },
    { type: "divider" },
    { key: ACTION.create, label: "New workspace", icon: <PlusIcon className={ICON_CLASS} /> },
    ...(current ? [{ key: ACTION.members, label: "Members and settings", icon: <UsersIcon className={ICON_CLASS} /> }] : []),
    { key: ACTION.tokens, label: "Access tokens", icon: <KeyRoundIcon className={ICON_CLASS} /> },
  ];

  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (key === ACTION.create) return setIsCreating(true);
    if (key === ACTION.members) return router.push(PAGE_ROUTES.members(workspaceId));
    if (key === ACTION.tokens) return router.push(PAGE_ROUTES.tokens);
    router.push(PAGE_ROUTES.workspace(key));
  };

  return (
    <>
      <Dropdown trigger={["click"]} menu={{ items, onClick, selectable: false }}>
        <Button block className="justify-between" aria-label="Switch workspace">
          <span className="min-w-0 truncate">{current?.name ?? "Choose a workspace"}</span>
          <ChevronsUpDownIcon className={`${ICON_CLASS} shrink-0 text-fg-muted`} />
        </Button>
      </Dropdown>
      <CreateWorkspaceDialog open={isCreating} onClose={() => setIsCreating(false)} />
    </>
  );
};
