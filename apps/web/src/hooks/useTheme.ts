import { useEffect } from "react";
import type { Theme } from "./useSettings";

export function useTheme(theme: Theme) {
  useEffect(() => {
    function apply() {
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          matchMedia("(prefers-color-scheme: dark)").matches);

      document.documentElement.classList.toggle("dark", isDark);

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", isDark ? "#0c0a09" : "#fafaf9");
      }
    }

    apply();

    if (theme === "system") {
      const mq = matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);
}
