"use client";

import { Button, Input } from "antd";
import { useState } from "react";
import type { WorkspaceSummary } from "@/shared/types";
import { useRenameWorkspaceForm } from "../hooks";
import { DeleteWorkspaceDialog } from "./deleteWorkspaceDialog";

const SECTION_TITLE_CLASS = "mb-3 text-ui font-semibold";

// Owner only: rename the workspace, or delete it with everything inside.
export const WorkspaceSettings = ({ workspace }: { workspace: WorkspaceSummary }) => {
  const form = useRenameWorkspaceForm(workspace);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <section aria-labelledby="workspace-name-title">
        <h2 id="workspace-name-title" className={SECTION_TITLE_CLASS}>
          Workspace name
        </h2>
        <form noValidate onSubmit={form.submit} className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Input
              aria-label="Workspace name"
              value={form.name}
              status={form.error ? "error" : undefined}
              onChange={(event) => form.onNameChange(event.target.value)}
            />
            <Button htmlType="submit" loading={form.isSubmitting} disabled={form.isUnchanged}>
              Save
            </Button>
          </div>
          {form.error && <p className="text-ui-sm text-error">{form.error}</p>}
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
