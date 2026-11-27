"use client";

import { Button, Empty, Popconfirm } from "antd";
import { TOKEN_SCOPE_LABEL } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import type { AccessToken } from "@/shared/types";
import { useRevokeToken } from "../hooks";

const DATE_FORMAT = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

const formatDate = (value: string | null) => (value ? DATE_FORMAT.format(new Date(value)) : "Never");

const TokenRow = ({ token }: { token: AccessToken }) => {
  const toast = useToast();
  const revokeToken = useRevokeToken();

  const revoke = () =>
    revokeToken.mutate(token.id, {
      onError: toast.error,
      onSuccess: () => toast.success(`Revoked ${token.name}`),
    });

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-muted py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-ui font-medium">{token.name}</span>
        <span className="text-ui-sm text-fg-muted">{TOKEN_SCOPE_LABEL[token.scope]}</span>
      </div>
      <div className="flex flex-col text-ui-sm text-fg-muted">
        <span>Created {formatDate(token.createdAt)}</span>
        <span>Last used {formatDate(token.lastUsedAt)}</span>
      </div>
      <Popconfirm
        title={`Revoke ${token.name}?`}
        description="Tools using it stop working at once."
        okText="Revoke"
        okButtonProps={{ danger: true }}
        onConfirm={revoke}>
        <Button size="small" danger type="text" loading={revokeToken.isPending}>
          Revoke
        </Button>
      </Popconfirm>
    </li>
  );
};

export const TokenList = ({ tokens }: { tokens: AccessToken[] }) => {
  if (!tokens.length) return <Empty description="No access tokens yet" className="py-8" />;

  return (
    <ul className="rounded-md border border-border-muted bg-surface px-4">
      {tokens.map((token) => (
        <TokenRow key={token.id} token={token} />
      ))}
    </ul>
  );
};
