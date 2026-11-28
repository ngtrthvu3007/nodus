"use client";

import { Input, Modal } from "antd";
import { useCreateWorkspaceForm } from "../hooks";

type CreateWorkspaceDialogProps = {
  open: boolean;
  onClose: () => void;
};

export const CreateWorkspaceDialog = ({ open, onClose }: CreateWorkspaceDialogProps) => {
  const form = useCreateWorkspaceForm(onClose);

  return (
    <Modal
      open={open}
      title="New workspace"
      okText="Create"
      confirmLoading={form.isSubmitting}
      onOk={() => form.submit()}
      onCancel={form.close}
      destroyOnHidden>
      <form noValidate onSubmit={form.submit} className="flex flex-col gap-1 pt-2">
        <label htmlFor="workspace-name" className="text-ui-sm font-medium">
          Name
        </label>
        <Input
          id="workspace-name"
          autoFocus
          placeholder="Team docs"
          value={form.name}
          status={form.error ? "error" : undefined}
          onChange={(event) => form.onNameChange(event.target.value)}
        />
        {form.error && <p className="text-ui-sm text-error">{form.error}</p>}
      </form>
    </Modal>
  );
};
