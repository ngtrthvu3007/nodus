import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { themeInitScript } from "@/shared/theme/theme-script";
import { THEME_COOKIE, isThemeMode } from "@/shared/theme/tokens";
import { AppShell } from "./app-shell";
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

export const metadata: Metadata = {
  title: "Nodus",
  description: "Write linked technical docs.",
};

// Reads the theme cookie so antd is server-rendered in the same mode the head script applies.
const ThemedProviders = async ({ children }: { children: ReactNode }) => {
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  return <Providers initialMode={isThemeMode(stored) ? stored : "light"}>{children}</Providers>;
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  // suppressHydrationWarning: themeInitScript sets data-theme before React hydrates
  <html
    lang="en"
    suppressHydrationWarning
    className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
    <head>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
    </head>
    <body className="flex min-h-full flex-col">
      {/* Runtime data (theme cookie, antd's random cache id) must render inside Suspense with cacheComponents */}
      <Suspense fallback={null}>
        <ThemedProviders>
          <AppShell>{children}</AppShell>
        </ThemedProviders>
      </Suspense>
    </body>
  </html>
);

export default RootLayout;
