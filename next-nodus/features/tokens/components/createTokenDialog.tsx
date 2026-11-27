"use client";

import { Alert, Input, Modal, Radio, Typography } from "antd";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { TOKEN_SCOPE, TOKEN_SCOPE_LABEL } from "@/shared/constants";
import { ApiError } from "@/shared/libs/httpClient";
import type { CreatedToken, TokenScope } from "@/shared/types";
import { useCreateToken } from "../hooks";

const MAX_TOKEN_NAME_LENGTH = 100;

// Same rules as the API: a name of 1-100 characters, and the account password again.
const tokenSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(MAX_TOKEN_NAME_LENGTH, "Name can be at most 100 characters."),
  password: z.string().min(1, "Enter your password."),
});

const SCOPE_OPTIONS = Object.values(TOKEN_SCOPE).map((scope) => ({ value: scope, label: TOKEN_SCOPE_LABEL[scope] }));

// A wrong password is 403 invalid_password, not 401, so it is shown here instead of signing the user out.
const getErrorMessage = (error: Error) => (error instanceof ApiError ? error.message : "Could not reach the server.");

type FieldErrors = { name?: string; password?: string };

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
  const createToken = useCreateToken();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<TokenScope>(TOKEN_SCOPE.read);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const close = () => {
    setName("");
    setScope(TOKEN_SCOPE.read);
    setPassword("");
    setFieldErrors({});
    createToken.reset();
    onClose();
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();

    const result = tokenSchema.safeParse({ name, password });
    if (!result.success) {
      return setFieldErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])));
    }

    createToken.mutate({ ...result.data, scope }, { onSuccess: () => setPassword("") });
  };

  const created = createToken.data;

  return (
    <Modal
      open={open}
      title={created ? `Token "${created.name}" created` : "New access token"}
      okText={created ? "Done" : "Create token"}
      confirmLoading={createToken.isPending}
      onOk={created ? close : () => submit()}
      onCancel={close}
      cancelButtonProps={{ hidden: Boolean(created) }}
      destroyOnHidden>
      {created ? (
        <CreatedTokenNotice created={created} />
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4 pt-2">
          {createToken.error && <Alert type="error" showIcon title={getErrorMessage(createToken.error)} />}

          <div className="flex flex-col gap-1">
            <label htmlFor="token-name" className="text-ui-sm font-medium">
              Name
            </label>
            <Input
              id="token-name"
              autoFocus
              placeholder="claude-code"
              value={name}
              status={fieldErrors.name ? "error" : undefined}
              onChange={(event) => {
                setName(event.target.value);
                setFieldErrors(({ password: passwordError }) => ({ password: passwordError }));
              }}
            />
            {fieldErrors.name && <p className="text-ui-sm text-error">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-ui-sm font-medium">Access</span>
            <Radio.Group value={scope} options={SCOPE_OPTIONS} onChange={(event) => setScope(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="token-password" className="text-ui-sm font-medium">
              Your password
            </label>
            <Input.Password
              id="token-password"
              autoComplete="current-password"
              value={password}
              status={fieldErrors.password ? "error" : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors(({ name: nameError }) => ({ name: nameError }));
              }}
            />
            {fieldErrors.password && <p className="text-ui-sm text-error">{fieldErrors.password}</p>}
          </div>
        </form>
      )}
    </Modal>
  );
};
