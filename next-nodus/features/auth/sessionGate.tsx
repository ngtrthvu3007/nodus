"use client";

import { Spin } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AppShell, LoadError } from "@/shared/components";
import { PAGE_ROUTES } from "@/shared/constants";
import { AccountMenu } from "./components";
import { useCurrentUser } from "./hooks";
import { isUnauthenticated } from "./lib/session";

const AUTH_PAGES: string[] = [PAGE_ROUTES.login, PAGE_ROUTES.register];

const FullScreenSpin = () => (
  <div className="flex h-screen items-center justify-center bg-canvas">
    <Spin />
  </div>
);

type SessionGateProps = {
  sidebar: ReactNode;
  tabs: ReactNode;
  children: ReactNode;
};

// Shows the app shell only to a signed-in user: anyone else goes to the login page.
// The login and register pages render without the shell, and send a signed-in user home.
// The sidebar and tabs are mounted only once signed in, so they never call the API without a session.
export const SessionGate = ({ sidebar, tabs, children }: SessionGateProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, error, isPending, refetch } = useCurrentUser();
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isSignedOut = isUnauthenticated(error);

  useEffect(() => {
    if (isAuthPage && user) router.replace(PAGE_ROUTES.home);
    if (!isAuthPage && isSignedOut) router.replace(PAGE_ROUTES.login);
  }, [isAuthPage, isSignedOut, user, router]);

  if (isAuthPage) return user ? <FullScreenSpin /> : children;

  if (user) {
    return (
      <AppShell sidebar={sidebar} tabs={tabs} account={<AccountMenu />}>
        {children}
      </AppShell>
    );
  }

  if (isPending || isSignedOut) return <FullScreenSpin />;

  return <LoadError title="Could not reach the server" onRetry={refetch} className="m-8" />;
};
