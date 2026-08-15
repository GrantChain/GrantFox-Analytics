"use client";

import { useMemo, useSyncExternalStore } from "react";

import { Card } from "@/components/ui/card";
import type {
  Campaign,
  CampaignSummaries,
  ContributorPaymentsPage,
  MaintainerPayouts,
} from "../types";

import { ALL_CAMPAIGNS, CampaignFilter } from "./CampaignFilter";
import { ContributorPaymentsTable } from "./ContributorPaymentsTable";
import { MaintainerPayoutsTable } from "./MaintainerPayoutsTable";
import { SummaryTiles } from "./SummaryTiles";

const paramListeners = new Set<() => void>();

function subscribeToCampaign(onChange: () => void): () => void {
  paramListeners.add(onChange);
  window.addEventListener("popstate", onChange);

  return () => {
    paramListeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function readCampaignParam(): string {
  return (
    new URLSearchParams(window.location.search).get("campaign") ??
    ALL_CAMPAIGNS
  );
}

function writeCampaignParam(value: string) {
  const url = new URL(window.location.href);
  if (value === ALL_CAMPAIGNS) url.searchParams.delete("campaign");
  else url.searchParams.set("campaign", value);

  window.history.replaceState(null, "", url);
  for (const notify of paramListeners) notify();
}

export function PaymentsDashboard({
  campaigns,
  payments,
  maintainers,
  summaries,
  excluded,
}: {
  campaigns: Campaign[];
  payments: ContributorPaymentsPage | null;
  maintainers: MaintainerPayouts | null;
  summaries: CampaignSummaries | null;
  excluded: number;
}) {
  const requested = useSyncExternalStore(
    subscribeToCampaign,
    readCampaignParam,
    () => ALL_CAMPAIGNS,
  );

  const campaign = campaigns.some((c) => c.campaign_id === requested)
    ? requested
    : ALL_CAMPAIGNS;

  const summary =
    campaign === ALL_CAMPAIGNS
      ? (summaries?.all ?? null)
      : (summaries?.by_campaign[campaign] ?? null);

  const contributors = useMemo(() => {
    if (!payments) return null;

    const items =
      campaign === ALL_CAMPAIGNS
        ? payments.items
        : payments.items.filter((p) => p.campaign_id === campaign);

    const totalCount = summary?.contributor_payments ?? items.length;

    return {
      items,
      totalCount,
      truncated: items.length < totalCount,
      unattributed: items.filter((p) => !p.username).length,
    };
  }, [payments, campaign, summary]);

  const payouts = useMemo(() => {
    if (!maintainers) return null;
    if (campaign === ALL_CAMPAIGNS) return maintainers;

    const items = maintainers.items.filter((m) => m.campaign_name === campaign);

    return {
      ...maintainers,
      items,
      total_funded: items.reduce((sum, i) => sum + i.funded_amount, 0),
      total_released: items.reduce((sum, i) => sum + i.released_amount, 0),
    };
  }, [maintainers, campaign]);

  const currency = summary?.currency ?? "USDC";

  return (
    <>
      <section className="space-y-4">
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight lg:text-4xl">
            View rewards
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Every reward GrantFox has released to open-source contributors and
            project maintainers, read from the Trustless Work escrows
            that settled them.
          </p>
        </div>

        {campaigns.length > 0 ? (
          <CampaignFilter
            campaigns={campaigns}
            selected={campaign}
            onSelect={writeCampaignParam}
          />
        ) : null}
      </section>

      <SummaryTiles summary={summary} />

      {contributors ? (
        <ContributorPaymentsTable
          payments={contributors.items}
          totalCount={contributors.totalCount}
          truncated={contributors.truncated}
          unattributed={contributors.unattributed}
          currency={currency}
        />
      ) : (
        <Card className="gap-2 p-6">
          <h2 className="font-heading text-lg font-semibold">
            Contributor payments
          </h2>
          <p className="text-sm text-muted-foreground">
            Payment records are temporarily unavailable. This is usually brief, but
            try again shortly.
          </p>
        </Card>
      )}

      <MaintainerPayoutsTable payouts={payouts} />

      {excluded > 0 ? (
        <p className="text-xs text-muted-foreground">
          {excluded} escrow{excluded === 1 ? "" : "s"} held by this platform
          {excluded === 1 ? " was" : " were"} excluded as test records (pre-prod) or as
          payments belonging to a different GrantFox product.
        </p>
      ) : null}
    </>
  );
}
