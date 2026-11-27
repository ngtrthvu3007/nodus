"use client";

import { Button, Input } from "antd";
import { useState, type FormEvent } from "react";
import { useToast } from "@/shared/hooks";
import type { WorkspaceSummary } from "@/shared/types";
import { useRenameWorkspace } from "../hooks";
import { workspaceNameSchema } from "../lib/workspaceName";
import { DeleteWorkspaceDialog } from "./deleteWorkspaceDialog";

const SECTION_TITLE_CLASS = "mb-3 text-ui font-semibold";

// Owner only: rename the workspace, or delete it with everything inside.
export const WorkspaceSettings = ({ workspace }: { workspace: WorkspaceSummary }) => {
  const toast = useToast();
  const renameWorkspace = useRenameWorkspace(workspace.id);
  const [name, setName] = useState(workspace.name);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const rename = (event: FormEvent) => {
    event.preventDefault();

    const result = workspaceNameSchema.safeParse(name);
    if (!result.success) return setError(result.error.issues[0].message);

    renameWorkspace.mutate(
      { name: result.data },
      { onError: toast.error, onSuccess: (renamed) => toast.success(`Renamed to ${renamed.name}`) },
    );
  };

  return (
    <>
      <section aria-labelledby="workspace-name-title">
        <h2 id="workspace-name-title" className={SECTION_TITLE_CLASS}>
          Workspace name
        </h2>
        <form noValidate onSubmit={rename} className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Input
              aria-label="Workspace name"
              value={name}
              status={error ? "error" : undefined}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
            />
            <Button htmlType="submit" loading={renameWorkspace.isPending} disabled={name.trim() === workspace.name}>
              Save
            </Button>
          </div>
          {error && <p className="text-ui-sm text-error">{error}</p>}
        </form>
      </section>

      <section aria-labelledby="danger-zone-title">
        <h2 id="danger-zone-title" className={`${SECTION_TITLE_CLASS} text-error`}>
          Delete workspace
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error px-4 py-3">
          <p className="text-ui text-fg-muted">Deletes every folder, doc and link in this workspace.</p>
          <Button danger onClick={() => setIsDeleting(true)}>
            Delete workspace
          </Button>
        </div>
        <DeleteWorkspaceDialog workspace={workspace} open={isDeleting} onClose={() => setIsDeleting(false)} />
      </section>
    </>
  );
};
