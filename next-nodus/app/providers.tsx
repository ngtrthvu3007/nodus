"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider, theme } from "antd";
import { useMemo, useState, type ReactNode } from "react";
import { ThemeProvider, useThemeMode } from "@/shared/theme/theme-provider";
import { buildThemeConfig, type ThemeMode } from "@/shared/theme/tokens";

interface ProvidersProps {
  initialMode: ThemeMode;
  children: ReactNode;
}

const AntdProviders = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());
  const { mode } = useThemeMode();
  const themeConfig = useMemo(() => buildThemeConfig(theme, mode), [mode]);

  return (
    // `layer` wraps antd styles in @layer antd (ordered in globals.css) so Tailwind utilities override them.
    <AntdRegistry layer>
      <ConfigProvider theme={themeConfig}>
        <App>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
};

export const Providers = ({ initialMode, children }: ProvidersProps) => (
  <ThemeProvider initialMode={initialMode}>
    <AntdProviders>{children}</AntdProviders>
  </ThemeProvider>
);
