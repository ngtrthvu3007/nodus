"use client";

import { PlusIcon } from "lucide-react";
import { Button, Skeleton } from "antd";
import { useState } from "react";
import { LoadError } from "@/shared/components";
import { CreateTokenDialog, TokenList } from "./components";
import { useTokens } from "./hooks";

// /settings/tokens: personal access tokens for tools outside the browser (MCP, CLI). They belong to the account, not
// to a workspace, and reach every workspace the user is a member of.
export const TokensView = () => {
  const { data: tokens, isPending, refetch } = useTokens();
  const [isCreating, setIsCreating] = useState(false);

  const renderTokens = () => {
    if (isPending) return <Skeleton active />;
    if (!tokens) return <LoadError title="Could not load the tokens" onRetry={refetch} />;
    return <TokenList tokens={tokens} />;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-h2 font-semibold">Access tokens</h1>
            <p className="text-ui text-fg-muted">For tools outside the browser, such as MCP or a script.</p>
          </div>
          <Button type="primary" icon={<PlusIcon className="size-4" />} onClick={() => setIsCreating(true)}>
            New token
          </Button>
        </header>
        {renderTokens()}
        <CreateTokenDialog open={isCreating} onClose={() => setIsCreating(false)} />
      </div>
    </div>
  );
};
