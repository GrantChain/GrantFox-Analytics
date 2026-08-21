"use client";

import { InfoIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAmount,
  formatCount,
  grantfoxOrganizationUrl,
  grantfoxProfileUrl,
  safeAvatarUrl,
} from "../formatters";
import type { ContributorPayment } from "../types";

import { StellarLink } from "./StellarLink";
import { UsdcIcon } from "./UsdcIcon";

const PAGE_SIZE = 25;

export function ContributorPaymentsTable({
  payments,
  totalCount,
  truncated,
  unattributed,
  currency,
}: {
  payments: ContributorPayment[];
  totalCount: number;
  truncated: boolean;
  unattributed: number;
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? payments.filter(
          (p) =>
            p.username?.toLowerCase().includes(needle) ||
            p.project_name.toLowerCase().includes(needle),
        )
      : payments;

    return filtered;
  }, [payments, query]);

  const shown = rows.slice(0, visible);
  const remaining = rows.length - shown.length;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="space-y-3 border-b border-border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold">
              Contributor payments
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatCount(totalCount)} released payment
              {totalCount === 1 ? "" : "s"}
              {rows.length !== payments.length
                ? ` | ${formatCount(rows.length)} matching`
                : null}
              {truncated
                ? ` | showing the most recent ${formatCount(payments.length)}`
                : null}
              {unattributed > 0
                ? ` | ${formatCount(unattributed)} without a resolved GitHub handle`
                : null}
            </p>
          </div>
          <div className="relative sm:w-72">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Search contributor or project"
              aria-label="Search contributor payments"
              className="pl-9"
            />
          </div>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            Released payments without a resolved GitHub handle are shown as
            Unattributed. This can happen when a repository is renamed after the
            payment is recorded.
          </span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Contributor</TableHead>
              <TableHead className="min-w-[200px]">Project</TableHead>
              <TableHead className="min-w-[140px] text-right">
                <span className="ml-auto inline-flex items-center gap-1">
                  Amount
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
                  {payments.length === 0
                    ? "No released contributor payments yet."
                    : "No payments match that search."}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((p) => (
                <TableRow key={p.payment_id}>
                  <TableCell>
                    {p.username ? (
                      <a
                        href={grantfoxProfileUrl(p.username)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2.5 transition-colors hover:text-brand-primary"
                      >
                        <Avatar className="size-7">
                          <AvatarImage
                            src={safeAvatarUrl(p.avatar_url)}
                            alt={p.username}
                          />
                          <AvatarFallback className="text-xs">
                            {p.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{p.username}</span>
                      </a>
                    ) : (
                      <span
                        className="text-muted-foreground"
                        title="The escrow records this payment but its pull request author could not be resolved."
                      >
                        Unattributed
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={grantfoxOrganizationUrl(p.project_name)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="transition-colors hover:text-brand-primary"
                    >
                      {p.project_name}
                    </a>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatAmount(p.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StellarLink escrowId={p.escrow_id} />
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
