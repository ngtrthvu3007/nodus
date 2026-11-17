"use client";

import { LogOutIcon } from "lucide-react";
import { Button, Tooltip } from "antd";
import { useToast } from "@/shared/hooks";
import { useCurrentUser, useLogout } from "../hooks";

// Signed-in email and the sign-out button, at the bottom of the sidebar.
export const AccountMenu = () => {
  const toast = useToast();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  const signOut = () => logout.mutate(undefined, { onError: toast.error });

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate text-ui-sm text-fg-muted" title={user?.email}>
        {user?.email}
      </span>
      <Tooltip title="Sign out">
        <Button
          size="small"
          type="text"
          aria-label="Sign out"
          loading={logout.isPending}
          icon={<LogOutIcon className="size-4" />}
          onClick={signOut}
        />
      </Tooltip>
    </div>
  );
};
