"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/shared/hooks";
import type { WorkspaceSummary } from "@/shared/types";
import { workspaceNameSchema } from "../lib/workspaceName";
import { useRenameWorkspace } from "./useWorkspaceMutations";

export const useRenameWorkspaceForm = (workspace: WorkspaceSummary) => {
  const toast = useToast();
  const renameWorkspace = useRenameWorkspace(workspace.id);
  const [name, setName] = useState(workspace.name);
  const [error, setError] = useState<string | null>(null);

  const onNameChange = (value: string) => {
    setName(value);
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const result = workspaceNameSchema.safeParse(name);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    renameWorkspace.mutate(
      { name: result.data },
      { onError: toast.error, onSuccess: (renamed) => toast.success(`Renamed to ${renamed.name}`) },
    );
  };

  return {
    name,
    error,
    onNameChange,
    submit,
    isUnchanged: name.trim() === workspace.name,
    isSubmitting: renameWorkspace.isPending,
  };
};
