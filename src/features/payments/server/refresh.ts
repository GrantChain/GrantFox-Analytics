import "server-only";

import { revalidateTag } from "next/cache";
import { after } from "next/server";

import { getGithubCoreRateLimit } from "./github";
import { refreshSnapshot, type AttributionSummary } from "./snapshot";

const GITHUB_QUOTA_RESERVE = 250;

const GITHUB_REFRESH_LOOKUP_ALLOWANCE = 2_000;

const MIN_ATTRIBUTION_RATIO = 0.9;

function rejectionReason(attribution: AttributionSummary): string | null {
  if (attribution.quota_exhausted) return "github_quota_exhausted";
  if (attribution.budget_exhausted) return "attribution_budget_exhausted";
  if (attribution.cap_reached) return "attribution_lookup_cap_reached";

  const ratio =
    attribution.total === 0 ? 1 : attribution.resolved / attribution.total;
  if (ratio < MIN_ATTRIBUTION_RATIO) return "attribution_below_90_percent";

  return null;
}

export async function refreshPayments(origin: string) {
  const startedAt = Date.now();
  const rateLimit = await getGithubCoreRateLimit();
  const required = GITHUB_REFRESH_LOOKUP_ALLOWANCE + GITHUB_QUOTA_RESERVE;

  console.log(
    JSON.stringify({
      level: "info",
      msg: "payment refresh started",
      github_rate_limit: rateLimit,
      github_required: required,
    }),
  );

  // Preserve the current page when GitHub cannot produce a healthy replacement.
  if (rateLimit.remaining < required) {
    const result = {
      ok: false,
      published: false,
      reason: "github_quota_insufficient",
      duration_ms: Date.now() - startedAt,
      github_rate_limit: rateLimit,
      github_required: required,
      at: new Date().toISOString(),
    };
    console.warn(JSON.stringify({ level: "warn", ...result }));
    return result;
  }

  revalidateTag("payments", { expire: 0 });
  revalidateTag("trustless-work", { expire: 0 });

  const attribution = await refreshSnapshot();
  const refreshedAt = Date.now();
  const reason = rejectionReason(attribution);

  if (reason) {
    revalidateTag("payments", { expire: 0 });

    const result = {
      ok: false,
      published: false,
      reason,
      duration_ms: Date.now() - startedAt,
      refresh_ms: refreshedAt - startedAt,
      attribution,
      github_rate_limit: rateLimit,
      at: new Date().toISOString(),
    };
    console.warn(JSON.stringify({ level: "warn", ...result }));
    return result;
  }

  // Warming before the response commits can miss the newly written cache entry.
  after(async () => {
    const warmStartedAt = Date.now();
    try {
      const warm = await fetch(origin, { cache: "no-store" });
      console.log(
        JSON.stringify({
          level: warm.ok ? "info" : "error",
          msg: "payment page warm completed",
          warm_status: warm.status,
          warm_ms: Date.now() - warmStartedAt,
        }),
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "payment page warm failed",
          error: err instanceof Error ? err.message : String(err),
          warm_ms: Date.now() - warmStartedAt,
        }),
      );
    }
  });

  return {
    ok: true,
    published: true,
    duration_ms: Date.now() - startedAt,
    refresh_ms: refreshedAt - startedAt,
    warm_scheduled: true,
    attribution,
    github_rate_limit: rateLimit,
    at: new Date().toISOString(),
  };
}
