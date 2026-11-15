import { useEffect } from "react";
import { THEME_MODE } from "@/shared/theme";

// The print copy of a doc is always light. The attribute is flipped only while the browser renders the page for
// printing, without telling ThemeProvider, so the saved theme (cookie, state) is untouched.
export const usePrintLight = () => {
  useEffect(() => {
    const root = document.documentElement;
    let previous: string | undefined;

    const toLight = () => {
      previous = root.dataset.theme;
      root.dataset.theme = THEME_MODE.light;
    };
    const restore = () => {
      if (previous) root.dataset.theme = previous;
      previous = undefined;
    };

    window.addEventListener("beforeprint", toLight);
    window.addEventListener("afterprint", restore);

    return () => {
      window.removeEventListener("beforeprint", toLight);
      window.removeEventListener("afterprint", restore);
      restore();
    };
  }, []);
};
