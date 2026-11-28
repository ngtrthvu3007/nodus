"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PAGE_ROUTES } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import { workspaceNameSchema } from "../lib/workspaceName";
import { useCreateWorkspace } from "./useWorkspaceMutations";

export const useCreateWorkspaceForm = (onClose: () => void) => {
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

  const onNameChange = (value: string) => {
    setName(value);
    setError(null);
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();

    const result = workspaceNameSchema.safeParse(name);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    createWorkspace.mutate(
      { name: result.data },
      {
        onError: toast.error,
        // Runs after useCreateWorkspace refreshed GET /me, so the new workspace's page finds it.
        onSuccess: (created) => {
          close();
          router.push(PAGE_ROUTES.workspace(created.id));
        },
      },
    );
  };

  return { name, error, onNameChange, submit, close, isSubmitting: createWorkspace.isPending };
};
