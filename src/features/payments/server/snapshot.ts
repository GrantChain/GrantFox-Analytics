import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { MaintainerPayout } from "../types";
import { resolvePrAuthors, type AttributionStats } from "./github";
import {
  classifyEscrow,
  isReleased,
  listPlatformEscrows,
  parseMilestoneDescription,
  parseTitle,
  type TwEscrow,
} from "./trustless-work";

const DAY_SECONDS = 24 * 60 * 60;

// Keep expiry beyond the daily refresh so visitors never trigger a cold rebuild.
const CACHE_TTL = 7 * DAY_SECONDS;
const FALLBACK_CURRENCY = "USDC";
const GITHUB_HOURLY_QUOTA = 5_000;
const ATTRIBUTION_BUDGET_MS = 180_000;

export type AttributionSummary = {
  resolved: number;
  total: number;
} & AttributionStats;

export type PaymentSnapshot = {
  fetched_at: string;
  currency: string;
  campaigns: string[];
  contributor: Array<{
    escrow_id: string;
    milestone_index: number;
    amount: number;
    campaign: string;
    project: string;
    pr_url: string;
    receiver: string;
    username: string | null;
    avatar_url: string | null;
  }>;
  maintainer: Array<MaintainerPayout & { receiver: string }>;
  excluded_escrows: number;
  attribution: AttributionSummary;
};

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Testing escrow IDs on actual prod campaigns we have to remove.
const TEST_ESCROW_IDS = new Set([
  "CBRZSYMMYZPIA3XUY53G6QZDTTNL4MV4LTTTCUTHGQ3DL26JCSHSGM5M",
  "CANBN3M7JX2R3TMCLVS64JMM4JWI67XFLQSUJTEIDKXVQSWETNBUORL4",
  "CCHY44PN6E4GGOAF74WCXYNGLWO7GO2E6QOPRAN3HKGMVN2WM275KHM6",
  "CAV6FHZ5ZC5GRU6KTMYA6UJY2MLNDBQ3MXQWIM3HMNJHW32JYVPRSUMW",
]);

const JUNK_TITLE_PATTERNS = [/\[dev template\]/i, /^test-pr\b/i];

function isJunk(escrow: TwEscrow): boolean {
  const title = escrow.title ?? "";
  return JUNK_TITLE_PATTERNS.some((re) => re.test(title));
}

const JUNK_CAMPAIGNS = new Set(
  [
    "Test Fund ALL RELEASE",
    "Pre-Production",
    "Testing",
    "Final-testing",
    "Community Call Test Campaign",
    "Campaign-test-beta",
    "undefined",
  ].map((name) => name.toLowerCase()),
);

function isJunkCampaign(campaign: string): boolean {
  return JUNK_CAMPAIGNS.has(campaign.trim().toLowerCase());
}

// One cache entry keeps page renders to a single network-backed cache read.
const loadSnapshot = unstable_cache(
  async (): Promise<PaymentSnapshot> => {
    const escrows = await listPlatformEscrows();

    const contributor: PaymentSnapshot["contributor"] = [];
    const maintainer: PaymentSnapshot["maintainer"] = [];
    const campaigns = new Set<string>();
    let excluded = 0;
    let currency = FALLBACK_CURRENCY;

    for (const escrow of escrows) {
      if (TEST_ESCROW_IDS.has(escrow.contractId) || isJunk(escrow)) {
        excluded++;
        continue;
      }

      const kind = classifyEscrow(escrow);
      if (kind === "OTHER") {
        excluded++;
        continue;
      }

      const { campaign, project } = parseTitle(escrow.title);
      if (isJunkCampaign(campaign)) {
        excluded++;
        continue;
      }

      campaigns.add(campaign);
      currency = escrow.trustline?.symbol ?? currency;

      if (kind === "MAINTAINER") {
        const funded = num(escrow.amount);
        const released = escrow.flags?.released === true ? funded : 0;

        maintainer.push({
          project_id: project,
          project_name: project,
          campaign_id: campaign,
          campaign_name: campaign,
          escrow_id: escrow.contractId,
          funded_amount: funded,
          released_amount: released,
          balance: num(escrow.balance),
          maintainers: [],
          receiver: escrow.roles?.receiver ?? "",
        });
        continue;
      }

      (escrow.milestones ?? []).forEach((milestone, index) => {
        if (!isReleased(milestone)) return;

        const parsed = parseMilestoneDescription(milestone.description);

        contributor.push({
          escrow_id: escrow.contractId,
          milestone_index: index,
          amount: num(milestone.amount),
          campaign,
          project,
          pr_url: parsed?.prUrl ?? "",
          receiver: milestone.receiver ?? "",
          username: null,
          avatar_url: null,
        });
      });
    }

    const urls = contributor.map((p) => p.pr_url).filter(Boolean);
    const { authors, stats } = await resolvePrAuthors(urls, {
      budgetMs: ATTRIBUTION_BUDGET_MS,
      maxLookups: GITHUB_HOURLY_QUOTA,
    });

    for (const payment of contributor) {
      const author = authors.get(payment.pr_url);
      if (!author) continue;
      payment.username = author.login;
      payment.avatar_url = author.avatar_url;
    }

    return {
      fetched_at: new Date().toISOString(),
      currency,
      campaigns: [...campaigns].sort((a, b) => a.localeCompare(b)),
      contributor,
      maintainer,
      excluded_escrows: excluded,
      attribution: {
        resolved: authors.size,
        total: new Set(urls).size,
        ...stats,
      },
    };
  },
  ["payment-snapshot:v2"],
  { revalidate: CACHE_TTL, tags: ["payments", "trustless-work"] },
);

// Deduplicate the five parallel query projections during a cold render.
export const getPaymentSnapshot = cache(
  async (): Promise<PaymentSnapshot | null> => {
    try {
      return await loadSnapshot();
    } catch (err) {
      console.error("Trustless Work snapshot failed:", err);
      return null;
    }
  },
);

// Refreshes bypass request memoization after invalidation.
export async function refreshSnapshot(): Promise<AttributionSummary> {
  let snapshot: PaymentSnapshot | null = null;

  try {
    snapshot = await loadSnapshot();
  } catch (err) {
    console.error("Payment snapshot refresh failed:", err);
  }

  if (!snapshot) {
    return {
      resolved: 0,
      total: 0,
      network_lookups: 0,
      quota_exhausted: false,
      budget_exhausted: false,
      cap_reached: false,
      not_found: 0,
      secondary_limited: 0,
      failed: 0,
    };
  }

  return snapshot.attribution;
}
