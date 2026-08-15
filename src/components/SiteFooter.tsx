import { FaGithub } from "react-icons/fa";

import { GrantFoxThemedLogo } from "@/components/GrantFoxThemedLogo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <GrantFoxThemedLogo variant="grantfox" width={110} height={22} />
            <p className="max-w-md text-sm text-muted-foreground">
              Every figure on this page comes from released, on-chain settled
              payments. Contributors are identified only by their public GrantFox
              profile.
            </p>
          </div>
          <nav className="flex gap-6 text-sm">
            <a
              href="https://github.com/FabianSanchezD/grantfox-analytics"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <FaGithub className="size-4" aria-hidden />
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
