import type { ThemeConfig, theme as antdTheme } from "antd";

// Single source of design tokens for antd (ConfigProvider) and Tailwind (via buildTokens.mts).
// Palette: Slate & Blue (ADR-001 §5). antd derives hover/active shades from colorPrimary, so colors are hex.
// Neutrals are set explicitly: deriving them from colorBgBase gives muddy results.

type AntdTheme = typeof antdTheme;
type SeedToken = NonNullable<ThemeConfig["token"]>;
type Algorithm = AntdTheme["darkAlgorithm"];

export const THEME_MODE = { light: "light", dark: "dark" } as const;
export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];
export const THEME_MODES = Object.values(THEME_MODE);
export const DEFAULT_THEME_MODE: ThemeMode = THEME_MODE.light;

// Stored in a cookie (not localStorage) so the server renders antd in the right mode — no flash on load.
export const THEME_COOKIE = "nodus-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const isThemeMode = (value: unknown): value is ThemeMode => THEME_MODES.some((mode) => mode === value);

export const getOppositeThemeMode = (mode: ThemeMode): ThemeMode =>
  mode === THEME_MODE.dark ? THEME_MODE.light : THEME_MODE.dark;

// Type and spacing: calm, roomy UI chrome at 14px; documents read at 16px with a heading scale smaller than
// antd's defaults (38/30/24), which are too loud for long-form docs.
const baseToken = {
  fontFamily: "var(--font-geist-sans), system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontFamilyCode: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,
  fontSizeHeading1: 32,
  fontSizeHeading2: 24,
  fontSizeHeading3: 20,
  fontSizeHeading4: 18,
  fontSizeHeading5: 16,
  controlHeight: 34,
  controlHeightSM: 26,
  controlHeightLG: 40,
  borderRadius: 8,
} satisfies SeedToken;

const components: ThemeConfig["components"] = {
  // Sitemap rows: comfortable click targets for a docs tree.
  Tree: { titleHeight: 30 },
};

const modeToken: Record<ThemeMode, SeedToken> = {
  light: {
    colorPrimary: "#2563eb",
    colorTextBase: "#0f172a",
    colorBgLayout: "#f1f5f9",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorBorder: "#d9e0e8",
    colorBorderSecondary: "#e9eef4",
  },
  dark: {
    // Brand blue mixed with 20% white so it stays bright on gray surfaces.
    colorPrimary: "#629bf8",
    colorTextBase: "#ececee",
    colorBgLayout: "#212226",
    colorBgContainer: "#27282d",
    colorBgElevated: "#303136",
    colorBorder: "#46474e",
    colorBorderSecondary: "#37383e",
    // The bright accent needs dark text on solid fills for contrast (≈ 6.7:1).
    colorTextLightSolid: "#111216",
  },
};

const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// antd's dark algorithm desaturates the brand color and turns its soft backgrounds into heavy solid blocks.
// Keep the vivid light-mode shades, use translucent tints for soft backgrounds (gray shows through),
// and the lighter hover shade for links so they stay readable.
const vividDarkPrimary =
  (lightAlgorithm: Algorithm): Algorithm =>
  (seed, mapToken) => {
    const vivid = lightAlgorithm(seed);
    return {
      ...mapToken!,
      colorPrimary: vivid.colorPrimary,
      colorPrimaryHover: vivid.colorPrimaryHover,
      colorPrimaryActive: vivid.colorPrimaryActive,
      colorPrimaryBg: withAlpha(seed.colorPrimary, 0.16),
      colorPrimaryBgHover: withAlpha(seed.colorPrimary, 0.24),
      colorPrimaryBorder: withAlpha(seed.colorPrimary, 0.45),
      colorLink: vivid.colorPrimaryHover,
      colorLinkHover: vivid.colorPrimaryBorderHover,
      colorLinkActive: vivid.colorPrimary,
    };
  };

// `antd.theme` is passed in so this module stays free of antd runtime imports (the token script runs in Node).
export const buildThemeConfig = (antd: AntdTheme, mode: ThemeMode): ThemeConfig => {
  const colors = modeToken[mode];
  const token = { ...baseToken, ...colors, colorLink: colors.colorPrimary };
  const algorithm =
    mode === THEME_MODE.dark ? [antd.darkAlgorithm, vividDarkPrimary(antd.defaultAlgorithm)] : antd.defaultAlgorithm;

  // One CSS-variable scope per mode: the server-rendered light block (streamed into <body>) would otherwise
  // override the client-injected dark block, since both would use the same selector.
  return { token, algorithm, components, cssVar: { key: `nodus-${mode}` } };
};
