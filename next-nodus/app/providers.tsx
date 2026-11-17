"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider, theme } from "antd";
import { useMemo, useState, type ReactNode } from "react";
import { CURRENT_USER_KEY, isUnauthenticated } from "@/features/auth";
import { ThemeProvider, buildThemeConfig, useThemeMode, type ThemeMode } from "@/shared/theme";

type ProvidersProps = {
  initialMode: ThemeMode;
  children: ReactNode;
};

// A 401 from any call means the session ended: re-checking the current user lets SessionGate send the user to login.
// The current-user query itself is skipped, or its own 401 would trigger it again.
const createQueryClient = () => {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.queryKey[0] === CURRENT_USER_KEY[0] || !isUnauthenticated(error)) return;
        void queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isUnauthenticated(error)) void queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
      },
    }),
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
  });

  return queryClient;
};

const AntdProviders = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(createQueryClient);
  const { mode } = useThemeMode();
  const themeConfig = useMemo(() => buildThemeConfig(theme, mode), [mode]);

  return (
    // `layer` wraps antd styles in @layer antd (ordered in globals.css) so Tailwind utilities override them.
    <AntdRegistry layer>
      <ConfigProvider theme={themeConfig} modal={{ centered: true }}>
        <App notification={{ placement: "bottomRight" }}>
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
