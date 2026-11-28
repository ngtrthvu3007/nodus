"use client";

import { Alert, Input, Modal, Radio, Typography } from "antd";
import { TOKEN_SCOPE, TOKEN_SCOPE_LABEL } from "@/shared/constants";
import type { CreatedToken } from "@/shared/types";
import { useCreateTokenForm } from "../hooks";

const SCOPE_OPTIONS = Object.values(TOKEN_SCOPE).map((scope) => ({ value: scope, label: TOKEN_SCOPE_LABEL[scope] }));

// The token is shown once, right after it is made; the API keeps only its hash.
const CreatedTokenNotice = ({ created }: { created: CreatedToken }) => (
  <div className="flex flex-col gap-3 pt-2">
    <Alert type="warning" showIcon title="Copy this token now. You will not be able to see it again." />
    <Typography.Paragraph copyable={{ text: created.token }} code className="break-all">
      {created.token}
    </Typography.Paragraph>
    <p className="text-ui-sm text-fg-muted">
      Send it as <code>Authorization: Bearer &lt;token&gt;</code>. It works in every workspace you are a member of.
    </p>
  </div>
);

type CreateTokenDialogProps = {
  open: boolean;
  onClose: () => void;
};

export const CreateTokenDialog = ({ open, onClose }: CreateTokenDialogProps) => {
  const form = useCreateTokenForm(onClose);
  const { created, fieldErrors } = form;

  return (
    <Modal
      open={open}
      title={created ? `Token "${created.name}" created` : "New access token"}
      okText={created ? "Done" : "Create token"}
      confirmLoading={form.isSubmitting}
      onOk={created ? form.close : () => form.submit()}
      onCancel={form.close}
      cancelButtonProps={{ hidden: Boolean(created) }}
      destroyOnHidden>
      {created ? (
        <CreatedTokenNotice created={created} />
      ) : (
        <form noValidate onSubmit={form.submit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="token-name" className="text-ui-sm font-medium">
              Name
            </label>
            <Input
              id="token-name"
              autoFocus
              placeholder="claude-code"
              value={form.name}
              status={fieldErrors.name ? "error" : undefined}
              onChange={(event) => form.onNameChange(event.target.value)}
            />
            {fieldErrors.name && <p className="text-ui-sm text-error">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-ui-sm font-medium">Access</span>
            <Radio.Group
              value={form.scope}
              options={SCOPE_OPTIONS}
              onChange={(event) => form.onScopeChange(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="token-password" className="text-ui-sm font-medium">
              Your password
            </label>
            <Input.Password
              id="token-password"
              autoComplete="current-password"
              value={form.password}
              status={fieldErrors.password ? "error" : undefined}
              onChange={(event) => form.onPasswordChange(event.target.value)}
            />
            {fieldErrors.password && <p className="text-ui-sm text-error">{fieldErrors.password}</p>}
          </div>
        </form>
      )}
    </Modal>
  );
};
