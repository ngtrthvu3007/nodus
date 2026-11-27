"use client";

import { Button, Popconfirm, Select, Tag } from "antd";
import { useRouter } from "next/navigation";
import { PAGE_ROUTES, ROLE_LABEL, WORKSPACE_ROLE } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import type { WorkspaceMember, WorkspaceRole } from "@/shared/types";
import { useChangeMemberRole, useRemoveMember } from "../hooks";

const ROLE_OPTIONS = Object.values(WORKSPACE_ROLE).map((role) => ({ value: role, label: ROLE_LABEL[role] }));

type MemberListProps = {
  workspaceId: string;
  members: WorkspaceMember[];
  // The signed-in user, who can leave; an owner can also change roles and remove others.
  userId: string | undefined;
  isOwner: boolean;
};

type MemberRowProps = Omit<MemberListProps, "members"> & { member: WorkspaceMember };

// The API refuses to demote or remove the last owner (409 last_owner); its message is shown as is.
const MemberRow = ({ workspaceId, member, userId, isOwner }: MemberRowProps) => {
  const router = useRouter();
  const toast = useToast();
  const changeRole = useChangeMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const isSelf = member.userId === userId;

  const onRoleChange = (role: WorkspaceRole) =>
    changeRole.mutate({ userId: member.userId, role }, { onError: toast.error });

  const remove = () =>
    removeMember.mutate(member.userId, {
      onError: toast.error,
      // Leaving: the workspace is no longer the user's, so go to one that is.
      onSuccess: () => (isSelf ? router.replace(PAGE_ROUTES.home) : toast.success(`Removed ${member.email}`)),
    });

  const removeLabel = isSelf ? "Leave" : "Remove";
  const confirmTitle = isSelf ? "Leave this workspace?" : `Remove ${member.email}?`;

  return (
    <li className="flex items-center gap-3 border-b border-border-muted py-3 last:border-b-0">
      <span className="min-w-0 flex-1 truncate text-ui">
        {member.email}
        {isSelf && <Tag className="ml-2">You</Tag>}
      </span>
      {isOwner ? (
        <Select
          size="small"
          aria-label={`Role of ${member.email}`}
          value={member.role}
          options={ROLE_OPTIONS}
          loading={changeRole.isPending}
          onChange={onRoleChange}
          className="w-28"
        />
      ) : (
        <span className="w-28 text-ui-sm text-fg-muted">{ROLE_LABEL[member.role]}</span>
      )}
      {(isOwner || isSelf) && (
        <Popconfirm title={confirmTitle} okText={removeLabel} okButtonProps={{ danger: true }} onConfirm={remove}>
          <Button size="small" danger type="text" loading={removeMember.isPending}>
            {removeLabel}
          </Button>
        </Popconfirm>
      )}
    </li>
  );
};

export const MemberList = ({ members, ...rest }: MemberListProps) => (
  <ul className="rounded-md border border-border-muted bg-surface px-4">
    {members.map((member) => (
      <MemberRow key={member.userId} member={member} {...rest} />
    ))}
  </ul>
);
