"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Class-strategy dark mode toggle, matching the GrantFox apps.
 *
 * The initial class is applied before paint by the inline script in
 * `layout.tsx`, so this component only has to stay in sync with whatever the
 * document already says — it never decides the theme on first render.
 */
export function ThemeToggler({ className }: { className?: string }) {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggle = React.useCallback(() => {
    const root = document.documentElement;
    const apply = () => {
      const next = !root.classList.contains("dark");
      root.classList.toggle("dark", next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {
        // Private mode / storage disabled: the toggle still works for this page.
      }
    };

    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg border border-border",
        "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
        className,
      )}
    >
      <SunIcon className="size-4 dark:hidden" />
      <MoonIcon className="hidden size-4 dark:block" />
    </button>
  );
}
