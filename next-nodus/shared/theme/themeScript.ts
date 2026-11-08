import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, THEME_MODE, THEME_MODES } from "./tokens";

// Inlined in <head> so the first paint already uses the stored theme. Without a cookie (first visit) it
// follows the OS and stores the result, so the server renders the right mode from the next request on.
export const themeInitScript = `(() => {
  const root = document.documentElement;
  const match = document.cookie.match(/(?:^|; )${THEME_COOKIE}=(${THEME_MODES.join("|")})(?:;|$)/);
  let mode = match && match[1];
  if (!mode) {
    mode = matchMedia("(prefers-color-scheme: dark)").matches ? "${THEME_MODE.dark}" : "${THEME_MODE.light}";
    document.cookie = "${THEME_COOKIE}=" + mode + "; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax";
  }
  root.dataset.theme = mode;
})();`;
