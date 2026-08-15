import { ExternalLinkIcon } from "lucide-react";

import { trustlessWorkViewerUrl } from "../formatters";
export function StellarLink({ escrowId }: { escrowId: string }) {
  return (
    <a
      href={trustlessWorkViewerUrl(escrowId)}
      target="_blank"
      rel="noreferrer noopener"
      title={escrowId}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-brand-primary"
    >
      {escrowId.slice(0, 4)}…{escrowId.slice(-4)}
      <ExternalLinkIcon className="size-3" />
    </a>
  );
}
