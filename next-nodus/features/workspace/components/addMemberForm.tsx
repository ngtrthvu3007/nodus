"use client";

import { Button, Input, Select } from "antd";
import { ROLE_OPTIONS } from "@/shared/constants";
import { useAddMemberForm } from "../hooks";

// Owners add people who already have an account; there is no email invitation.
export const AddMemberForm = ({ workspaceId }: { workspaceId: string }) => {
  const form = useAddMemberForm(workspaceId);

  return (
    <form noValidate onSubmit={form.submit} className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Input
          type="email"
          aria-label="Email of the person to add"
          placeholder="teammate@example.com"
          value={form.email}
          status={form.error ? "error" : undefined}
          onChange={(event) => form.onEmailChange(event.target.value)}
          className="min-w-56 flex-1"
        />
        <Select
          aria-label="Role"
          value={form.role}
          options={ROLE_OPTIONS}
          onChange={form.onRoleChange}
          className="w-28"
        />
        <Button type="primary" htmlType="submit" loading={form.isSubmitting}>
          Add
        </Button>
      </div>
      {form.error && <p className="text-ui-sm text-error">{form.error}</p>}
    </form>
  );
};
