"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { WORKSPACE_ROLE } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import type { WorkspaceRole } from "@/shared/types";
import { useAddMember } from "./useMembers";

const emailSchema = z.email("Enter a valid email.");

// The API refuses an unknown email (user_not_found) or someone already in (already_member), and limits how often an
// owner can try; its message shows in a toast.
export const useAddMemberForm = (workspaceId: string) => {
  const toast = useToast();
  const addMember = useAddMember(workspaceId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>(WORKSPACE_ROLE.member);
  const [error, setError] = useState<string | null>(null);

  const onEmailChange = (value: string) => {
    setEmail(value);
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    addMember.mutate(
      { email: result.data, role },
      {
        onError: toast.error,
        onSuccess: (member) => {
          toast.success(`Added ${member.email}`);
          setEmail("");
          setRole(WORKSPACE_ROLE.member);
        },
      },
    );
  };

  return { email, role, error, onEmailChange, onRoleChange: setRole, submit, isSubmitting: addMember.isPending };
};
