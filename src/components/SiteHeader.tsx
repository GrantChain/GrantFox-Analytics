import { GrantFoxThemedLogo } from "@/components/GrantFoxThemedLogo";
import { ThemeToggler } from "@/components/ThemeToggler";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <GrantFoxThemedLogo variant="grantfox" width={120} height={24} priority />
          <span
            aria-hidden
            className="hidden h-5 w-px bg-border sm:block"
          />
          <span className="hidden text-sm text-muted-foreground sm:block">
            Analytics
          </span>
        </div>
        <ThemeToggler />
      </div>
    </header>
  );
}
