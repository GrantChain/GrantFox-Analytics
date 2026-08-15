import "server-only";

const PR_URL_RE =
  /github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i;

const CONCURRENCY = 8;
// GitHub's secondary limit permits roughly 15 REST requests per second.
const MIN_REQUEST_SPACING_MS = 70;

const MAX_LOOKUPS_PER_PASS = 250;

const SECONDARY_LIMIT_ATTEMPTS = 3;

const MAX_RETRY_AFTER_MS = 5_000;

export type GithubAuthor = {
  login: string;
  avatar_url: string | null;
};

export type GithubCoreRateLimit = {
  limit: number;
  remaining: number;
  reset: number;
};

export type AttributionStats = {
  network_lookups: number;
  quota_exhausted: boolean;
  budget_exhausted: boolean;
  cap_reached: boolean;
  not_found: number;
  secondary_limited: number;
  failed: number;
};

export function parsePrUrl(
  url: string,
): { owner: string; repo: string; number: string } | null {
  const match = PR_URL_RE.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: match[3] };
}

export class RateLimited extends Error {}

export async function getGithubCoreRateLimit(): Promise<GithubCoreRateLimit> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch("https://api.github.com/rate_limit", {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GitHub rate-limit check responded ${res.status}`);
  }

  const body = (await res.json()) as {
    resources?: {
      core?: { limit?: number; remaining?: number; reset?: number };
    };
  };
  const core = body.resources?.core;
  const limit = core?.limit;
  const remaining = core?.remaining;
  const reset = core?.reset;

  if (
    typeof limit !== "number" ||
    !Number.isFinite(limit) ||
    typeof remaining !== "number" ||
    !Number.isFinite(remaining) ||
    typeof reset !== "number" ||
    !Number.isFinite(reset)
  ) {
    throw new Error("GitHub returned an invalid core rate limit");
  }

  return { limit, remaining, reset };
}

class SecondaryRateLimited extends Error {
  constructor(readonly retryAfterMs: number) {
    super("GitHub secondary rate limit");
  }
}

class NotFound extends Error {}

function secondaryRetryDelayMs(res: Response): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS);
  }

  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) {
    const until = reset * 1000 - Date.now();
    if (until > 0) return Math.min(until, MAX_RETRY_AFTER_MS);
  }

  return 1_000;
}

async function requestAuthor(url: string): Promise<GithubAuthor> {
  const parsed = parsePrUrl(url);
  if (!parsed) throw new Error(`unparseable PR url: ${url}`);

  const token = process.env.GITHUB_TOKEN;

  const res = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    },
  );

  if (res.status === 403 || res.status === 429) {
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      throw new RateLimited("GitHub hourly quota exhausted");
    }
    throw new SecondaryRateLimited(secondaryRetryDelayMs(res));
  }

  if (res.status === 404) throw new NotFound(url);

  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);

  const body = (await res.json()) as {
    user?: { login?: string; avatar_url?: string };
  };

  if (!body.user?.login) throw new Error("PR has no author");

  return { login: body.user.login, avatar_url: body.user.avatar_url ?? null };
}

type PassCounters = Pick<
  AttributionStats,
  "network_lookups" | "secondary_limited"
>;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function requestPacer(spacingMs: number): () => Promise<void> {
  let nextSlot = 0;

  return async () => {
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + spacingMs;
    if (slot > now) await sleep(slot - now);
  };
}

async function fetchAuthor(
  url: string,
  counters: PassCounters,
  pace: () => Promise<void>,
): Promise<GithubAuthor> {
  for (let attempt = 1; ; attempt++) {
    await pace();
    counters.network_lookups++;
    try {
      return await requestAuthor(url);
    } catch (err) {
      if (
        !(err instanceof SecondaryRateLimited) ||
        attempt >= SECONDARY_LIMIT_ATTEMPTS
      ) {
        throw err;
      }
      counters.secondary_limited++;
      await sleep(err.retryAfterMs);
    }
  }
}

export async function resolvePrAuthors(
  urls: string[],
  {
    budgetMs = 25_000,
    maxLookups = MAX_LOOKUPS_PER_PASS,
  }: { budgetMs?: number; maxLookups?: number } = {},
): Promise<{ authors: Map<string, GithubAuthor>; stats: AttributionStats }> {
  const unique = [...new Set(urls.filter(Boolean))];
  const authors = new Map<string, GithubAuthor>();
  const deadline = Date.now() + budgetMs;
  const pace = requestPacer(MIN_REQUEST_SPACING_MS);
  let cursor = 0;

  const counters: PassCounters = { network_lookups: 0, secondary_limited: 0 };
  let quotaExhausted = false;
  let notFound = 0;
  let failed = 0;

  async function worker() {
    while (
      cursor < unique.length &&
      Date.now() < deadline &&
      !quotaExhausted &&
      counters.network_lookups < maxLookups
    ) {
      const url = unique[cursor++];
      try {
        authors.set(url, await fetchAuthor(url, counters, pace));
      } catch (err) {
        if (err instanceof RateLimited) quotaExhausted = true;
        else if (err instanceof NotFound) notFound++;
        else failed++;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker),
  );

  const stats: AttributionStats = {
    network_lookups: counters.network_lookups,
    quota_exhausted: quotaExhausted,
    budget_exhausted: cursor < unique.length && Date.now() >= deadline,
    cap_reached: counters.network_lookups >= maxLookups,
    not_found: notFound,
    secondary_limited: counters.secondary_limited,
    failed,
  };

  if (authors.size < unique.length) {
    console.warn(
      `Attributed ${authors.size} of ${unique.length} payments ` +
        `(${JSON.stringify(stats)}); the remainder resolve on later passes.`,
    );
  }

  return { authors, stats };
}
import "server-only";
