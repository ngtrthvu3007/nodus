import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { SessionGate } from "@/features/auth";
import { SearchPanel } from "@/features/search";
import { TabBar } from "@/features/tabs";
import { TreeView } from "@/features/tree";
import { WorkspaceOnly, WorkspacePageGate, WorkspaceSwitcher } from "@/features/workspace";
import { DEFAULT_THEME_MODE, THEME_COOKIE, isThemeMode, themeInitScript } from "@/shared/theme";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SessionGate waits for GET /me before it shows any page, so no page can render instantly: this opts the whole app
// out of the instant-navigation check, which otherwise reports every page as a dropped segment (Next 16, `instant`).
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Nodus", template: "%s · Nodus" },
  description: "Write linked technical docs.",
};

// Reads the theme cookie so antd is server-rendered in the same mode the head script applies.
const ThemedProviders = async ({ children }: { children: ReactNode }) => {
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  return <Providers initialMode={isThemeMode(stored) ? stored : DEFAULT_THEME_MODE}>{children}</Providers>;
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  // suppressHydrationWarning: themeInitScript sets data-theme before React hydrates
  <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
    <head>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
    </head>
    <body className="flex min-h-full flex-col overflow-hidden">
      {/* Runtime data (theme cookie, antd's random cache id) must render inside Suspense with cacheComponents */}
      <Suspense fallback={null}>
        <ThemedProviders>
          <SessionGate
            sidebar={
              <div className="flex flex-col gap-3">
                <WorkspaceSwitcher />
                <WorkspaceOnly>
                  <SearchPanel>
                    <TreeView />
                  </SearchPanel>
                </WorkspaceOnly>
              </div>
            }
            tabs={
              <WorkspaceOnly>
                <TabBar />
              </WorkspaceOnly>
            }>
            <WorkspacePageGate>{children}</WorkspacePageGate>
          </SessionGate>
        </ThemedProviders>
      </Suspense>
    </body>
  </html>
);

export default RootLayout;
