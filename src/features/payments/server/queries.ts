import "server-only";

import type {
  Campaign,
  CampaignSummaries,
  ContributorPayment,
  ContributorPaymentsPage,
  MaintainerPayout,
  MaintainerPayouts,
  PaymentSummary,
} from "../types";
import { getPaymentSnapshot, type PaymentSnapshot } from "./snapshot";

const MAX_PAYMENT_ROWS = 2000;
const STALE_AFTER_MS = 26 * 60 * 60 * 1000;

export async function getCampaigns(): Promise<Campaign[] | null> {
  const snapshot = await getPaymentSnapshot();
  if (!snapshot) return null;

  return snapshot.campaigns.map((name) => ({
    campaign_id: name,
    name,
    status: "",
  }));
}

function summarize(
  snapshot: PaymentSnapshot,
  campaignId?: string,
): PaymentSummary {
  const matchesCampaign = (campaign: string) =>
    !campaignId || campaign === campaignId;
  const payments = snapshot.contributor.filter((payment) =>
    matchesCampaign(payment.campaign),
  );
  const escrows = snapshot.maintainer.filter((payout) =>
    matchesCampaign(payout.campaign_name),
  );
  const contributorTotal = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const maintainerTotal = escrows.reduce(
    (sum, payout) => sum + payout.released_amount,
    0,
  );
  const projects = new Set([
    ...payments.map((payment) => payment.project),
    ...escrows.map((payout) => payout.project_name),
  ]);

  // Wallets provide stable distinct-person counts but are never returned to clients.
  const contributors = new Set(
    payments.map((payment) => payment.receiver).filter(Boolean),
  );
  const maintainers = new Set(
    escrows
      .filter((payout) => payout.released_amount > 0)
      .map((payout) => payout.receiver)
      .filter(Boolean),
  );

  return {
    campaign_id: campaignId ?? null,
    campaign_name: campaignId,
    currency: snapshot.currency,
    total_distributed: contributorTotal + maintainerTotal,
    contributor_total: contributorTotal,
    contributor_payments: payments.length,
    contributor_count: contributors.size,
    maintainer_total: maintainerTotal,
    maintainer_count: maintainers.size,
    maintainer_available: true,
    projects_funded: projects.size,
    snapshot_at: snapshot.fetched_at,
  };
}

export async function getSummaries(): Promise<CampaignSummaries | null> {
  const snapshot = await getPaymentSnapshot();
  if (!snapshot) return null;

  return {
    all: summarize(snapshot),
    by_campaign: Object.fromEntries(
      snapshot.campaigns.map((name) => [name, summarize(snapshot, name)]),
    ),
  };
}

export async function getContributorPayments(
  limit = MAX_PAYMENT_ROWS,
): Promise<ContributorPaymentsPage | null> {
  const snapshot = await getPaymentSnapshot();
  if (!snapshot) return null;

  const all = snapshot.contributor;
  const page = all.slice(0, limit);
  const items: ContributorPayment[] = page.map((payment) => ({
    payment_id: `${payment.escrow_id}:${payment.milestone_index}`,
    username: payment.username,
    avatar_url: payment.avatar_url,
    amount: payment.amount,
    project_id: payment.project,
    project_name: payment.project,
    campaign_id: payment.campaign,
    campaign_name: payment.campaign,
    escrow_id: payment.escrow_id,
  }));

  return {
    items,
    total_count: all.length,
    truncated: page.length < all.length,
  };
}

function withoutReceiver(
  entry: MaintainerPayout & { receiver: string },
): MaintainerPayout {
  const payout: MaintainerPayout & { receiver?: string } = { ...entry };
  delete payout.receiver;
  return payout;
}

export async function getMaintainerPayouts(): Promise<MaintainerPayouts | null> {
  const snapshot = await getPaymentSnapshot();
  if (!snapshot) return null;

  const items = snapshot.maintainer.map(withoutReceiver);
  const fetchedAt = new Date(snapshot.fetched_at).getTime();

  return {
    snapshot_at: snapshot.fetched_at,
    stale: Date.now() - fetchedAt > STALE_AFTER_MS,
    currency: snapshot.currency,
    items,
    total_funded: items.reduce((sum, item) => sum + item.funded_amount, 0),
    total_released: items.reduce((sum, item) => sum + item.released_amount, 0),
  };
}

export async function getExcludedEscrowCount(): Promise<number> {
  const snapshot = await getPaymentSnapshot();
  return snapshot?.excluded_escrows ?? 0;
}
