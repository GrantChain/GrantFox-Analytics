"use client";

import { InfoIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAmount, formatCount, grantfoxOrganizationUrl } from "../formatters";
import type { MaintainerPayouts } from "../types";

import { StellarLink } from "./StellarLink";
import { UsdcIcon } from "./UsdcIcon";

const PAGE_SIZE = 25;

export function MaintainerPayoutsTable({
  payouts,
}: {
  payouts: MaintainerPayouts | null;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (!payouts) {
    return (
      <Card className="gap-2 p-6">
        <h2 className="font-heading text-lg font-semibold">
          Maintainer payments
        </h2>
        <p className="text-sm text-muted-foreground">
          Maintainer payout data is temporarily unavailable. These figures are
          read from Trustless Work once a day; the most recent snapshot could
          not be loaded.
        </p>
      </Card>
    );
  }

  const { items, currency } = payouts;
  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="space-y-3 border-b border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold">
              Maintainer payments
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatCount(items.length)} project escrow
              {items.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            Maintainer funds are held in one escrow per project, so amounts are
            shown per project rather than split per maintainer. The escrow
            identifies maintainers only by wallet address, which is not published
            here, so individual handles are not listed.
          </span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Project</TableHead>
              <TableHead className="min-w-[130px] text-right">
                <span className="inline-flex items-center gap-1.5">
                  Released
                  {currency ? <UsdcIcon className="size-4" /> : null}
                </span>
              </TableHead>
              <TableHead className="min-w-[130px] text-right">
                <span className="inline-flex items-center gap-1.5">
                  Funded
                  {currency ? <UsdcIcon className="size-4" /> : null}
                </span>
              </TableHead>
              <TableHead className="min-w-[110px] text-right">Escrow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No maintainer escrows for this campaign yet.
                </TableCell>
              </TableRow>
            ) : (
              shown.map((item) => (
                <TableRow key={item.escrow_id}>
                  <TableCell>
                    <a
                      href={grantfoxOrganizationUrl(item.project_name)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium transition-colors hover:text-brand-primary"
                    >
                      {item.project_name}
                    </a>
                    <div className="text-xs text-muted-foreground">
                      {item.campaign_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatAmount(item.released_amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatAmount(item.funded_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StellarLink escrowId={item.escrow_id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {remaining > 0 ? (
        <div className="flex justify-center border-t border-border p-4">
          <Button
            variant="outline"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            Load {Math.min(PAGE_SIZE, remaining)} more
            <span className="text-muted-foreground">
              ({formatCount(remaining)} left)
            </span>
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
