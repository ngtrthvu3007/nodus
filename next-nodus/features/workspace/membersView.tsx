"use client";

import { Skeleton } from "antd";
import { LoadError } from "@/shared/components";
import { AddMemberForm, MemberList, WorkspaceSettings } from "./components";
import { useCurrentWorkspace, useMembers } from "./hooks";

// /w/[workspaceId]/members. Every member sees the list and can leave; an owner also adds, changes roles, removes,
// renames and deletes. WorkspacePageGate already answers a workspace the user is not in.
export const MembersView = () => {
  const { workspaceId, current, isOwner, userId } = useCurrentWorkspace();
  const { data: members, isPending, refetch } = useMembers(workspaceId);

  if (!current) return null;

  const renderMembers = () => {
    if (isPending) return <Skeleton active />;
    if (!members) return <LoadError title="Could not load the members" onRetry={refetch} />;
    return <MemberList workspaceId={workspaceId} members={members} userId={userId} isOwner={isOwner} />;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-8 py-10">
        <header>
          <h1 className="truncate text-h2 font-semibold">{current.name}</h1>
          <p className="text-ui text-fg-muted">Members and settings</p>
        </header>

        <section aria-labelledby="members-title" className="flex flex-col gap-3">
          <h2 id="members-title" className="text-ui font-semibold">
            Members
          </h2>
          {isOwner && <AddMemberForm workspaceId={workspaceId} />}
          {renderMembers()}
        </section>

        {isOwner && <WorkspaceSettings key={current.name} workspace={current} />}
      </div>
    </div>
  );
};
