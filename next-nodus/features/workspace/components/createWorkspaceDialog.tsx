"use client";

import { Input, Modal } from "antd";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PAGE_ROUTES } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import { useCreateWorkspace } from "../hooks";
import { workspaceNameSchema } from "../lib/workspaceName";

type CreateWorkspaceDialogProps = {
  open: boolean;
  onClose: () => void;
};

// The new workspace opens once GET /me lists it, so its pages do not show "not found" for a moment.
export const CreateWorkspaceDialog = ({ open, onClose }: CreateWorkspaceDialogProps) => {
  const router = useRouter();
  const toast = useToast();
  const createWorkspace = useCreateWorkspace();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName("");
    setError(null);
    onClose();
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();

    const result = workspaceNameSchema.safeParse(name);
    if (!result.success) return setError(result.error.issues[0].message);

    try {
      const created = await createWorkspace.mutateAsync({ name: result.data });
      close();
      router.push(PAGE_ROUTES.workspace(created.id));
    } catch (createError) {
      toast.error(createError);
    }
  };

  return (
    <Modal
      open={open}
      title="New workspace"
      okText="Create"
      confirmLoading={createWorkspace.isPending}
      onOk={() => submit()}
      onCancel={close}
      destroyOnHidden>
      <form noValidate onSubmit={submit} className="flex flex-col gap-1 pt-2">
        <label htmlFor="workspace-name" className="text-ui-sm font-medium">
          Name
        </label>
        <Input
          id="workspace-name"
          autoFocus
          placeholder="Team docs"
          value={name}
          status={error ? "error" : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
        />
        {error && <p className="text-ui-sm text-error">{error}</p>}
      </form>
    </Modal>
  );
};
