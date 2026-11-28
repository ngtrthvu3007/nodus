"use client";

import { Input, Modal } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAGE_ROUTES } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import type { WorkspaceSummary } from "@/shared/types";
import { useDeleteWorkspace } from "../hooks";

type DeleteWorkspaceDialogProps = {
  workspace: WorkspaceSummary;
  open: boolean;
  onClose: () => void;
};

// The API deletes every folder, doc and link inside without asking, so the name must be typed again first.
export const DeleteWorkspaceDialog = ({ workspace, open, onClose }: DeleteWorkspaceDialogProps) => {
  const router = useRouter();
  const toast = useToast();
  const deleteWorkspace = useDeleteWorkspace(workspace.id);
  const [typedName, setTypedName] = useState("");

  const close = () => {
    setTypedName("");
    onClose();
  };

  const confirmDelete = () =>
    deleteWorkspace.mutate(undefined, {
      onError: toast.error,
      onSuccess: () => {
        toast.success(`Deleted ${workspace.name}`);
        router.replace(PAGE_ROUTES.home);
      },
    });

  return (
    <Modal
      open={open}
      title="Delete workspace"
      okText="Delete workspace"
      okButtonProps={{ danger: true, disabled: typedName !== workspace.name }}
      confirmLoading={deleteWorkspace.isPending}
      onOk={confirmDelete}
      onCancel={close}
      destroyOnHidden>
      <div className="flex flex-col gap-3 pt-2">
        <p className="text-ui">
          This deletes <strong>{workspace.name}</strong> with every folder, doc and link in it. It cannot be undone.
        </p>
        <label htmlFor="confirm-workspace-name" className="text-ui-sm font-medium">
          Type the workspace name to confirm
        </label>
        <Input
          id="confirm-workspace-name"
          autoFocus
          autoComplete="off"
          placeholder={workspace.name}
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
        />
      </div>
    </Modal>
  );
};
