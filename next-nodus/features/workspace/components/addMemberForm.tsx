"use client";

import { Button, Input, Select } from "antd";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { ROLE_LABEL, WORKSPACE_ROLE } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import type { WorkspaceRole } from "@/shared/types";
import { useAddMember } from "../hooks";

const emailSchema = z.email("Enter a valid email.");

const ROLE_OPTIONS = Object.values(WORKSPACE_ROLE).map((role) => ({ value: role, label: ROLE_LABEL[role] }));

// Owners add people who already have an account; there is no email invitation. The API refuses an unknown email
// (user_not_found) or someone already in (already_member), and limits how often an owner can try.
export const AddMemberForm = ({ workspaceId }: { workspaceId: string }) => {
  const toast = useToast();
  const addMember = useAddMember(workspaceId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>(WORKSPACE_ROLE.member);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const result = emailSchema.safeParse(email.trim());
    if (!result.success) return setError(result.error.issues[0].message);

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

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Input
          type="email"
          aria-label="Email of the person to add"
          placeholder="teammate@example.com"
          value={email}
          status={error ? "error" : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          className="min-w-56 flex-1"
        />
        <Select aria-label="Role" value={role} options={ROLE_OPTIONS} onChange={setRole} className="w-28" />
        <Button type="primary" htmlType="submit" loading={addMember.isPending}>
          Add
        </Button>
      </div>
      {error && <p className="text-ui-sm text-error">{error}</p>}
    </form>
  );
};
