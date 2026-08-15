const FETCH_TTL_SECONDS = 7 * 24 * 60 * 60;
const REQUEST_TIMEOUT_MS = 120_000;

// The undocumented pageSize parameter cuts a full listing from ~108 requests to ~9.
const PAGE_SIZE = 100;

const PAGE_WINDOW = 6;

const MAX_PAGES = 60;

export type TwMilestone = {
  description?: string;
  amount?: number;
  receiver?: string;
  status?: string;
  flags?: { released?: boolean; disputed?: boolean; resolved?: boolean };
};

export type TwEscrow = {
  contractId: string;
  title?: string;
  description?: string;
  amount?: number;
  balance?: number;
  type?: string;
  roles?: { receiver?: string };
  trustline?: { symbol?: string };
  flags?: { released?: boolean; disputed?: boolean; resolved?: boolean };
  milestones?: TwMilestone[];
};

export type EscrowKind = "CONTRIBUTOR" | "MAINTAINER" | "OTHER";

function config() {
  const base = (
    process.env.TRUSTLESS_WORK_BASE_URL ?? "https://api.trustlesswork.com"
  ).replace(/\/$/, "");
  const apiKey = process.env.TRUSTLESS_WORK_API_KEY;
  const platform = process.env.GRANTFOX_PLATFORM_ADDRESS;

  if (!apiKey) throw new Error("TRUSTLESS_WORK_API_KEY is not set");
  if (!platform) {
    throw new Error(
      "GRANTFOX_PLATFORM_ADDRESS is not set. Escrows are enumerated by the " +
        "roles the GrantFox platform wallet holds, so its Stellar address is " +
        "required. It is the same value the GrantFox apps use as " +
        "NEXT_PUBLIC_GRANTFOX_WALLET.",
    );
  }

  return { base, apiKey, platform };
}

async function twFetch<T>(path: string, revalidate: number): Promise<T> {
  const { base, apiKey } = config();

  const res = await fetch(`${base}${path}`, {
    headers: { "x-api-key": apiKey, accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate, tags: ["trustless-work"] },
  });

  if (!res.ok) {
    throw new Error(`Trustless Work responded ${res.status} for ${path}`);
  }

  return (await res.json()) as T;
}

function asList(body: unknown): TwEscrow[] {
  if (Array.isArray(body)) return body as TwEscrow[];
  const data = (body as { data?: unknown } | null)?.data;
  if (Array.isArray(data)) return data as TwEscrow[];
  return body ? [body as TwEscrow] : [];
}

export async function listPlatformEscrows(): Promise<TwEscrow[]> {
  const { platform } = config();
  const byContractId = new Map<string, TwEscrow>();

  const fetchPage = async (page: number): Promise<TwEscrow[]> => {
    try {
      return asList(
        await twFetch<unknown>(
          `/helper/get-escrows-by-role?role=platformAddress` +
            `&roleAddress=${encodeURIComponent(platform)}` +
            `&page=${page}&pageSize=${PAGE_SIZE}`,
          FETCH_TTL_SECONDS,
        ),
      );
    } catch {
      return [];
    }
  };

  for (let start = 1; start <= MAX_PAGES; start += PAGE_WINDOW) {
    const pages = Array.from({ length: PAGE_WINDOW }, (_, i) => start + i);
    const batches = await Promise.all(pages.map(fetchPage));

    for (const batch of batches) {
      for (const escrow of batch) {
        if (escrow?.contractId) byContractId.set(escrow.contractId, escrow);
      }
    }

    if (batches.some((b) => b.length < PAGE_SIZE)) break;
  }

  return [...byContractId.values()];
}

export function classifyEscrow(escrow: TwEscrow): EscrowKind {
  const description = escrow.description ?? "";
  if (/contributors of/i.test(description)) return "CONTRIBUTOR";
  if (/maintainers of/i.test(description)) return "MAINTAINER";
  return "OTHER";
}

export function parseTitle(title: string | undefined): {
  campaign: string;
  project: string;
} {
  const value = (title ?? "").trim();
  if (!value) return { campaign: "Unknown campaign", project: "Unknown project" };

  const parts = value.split(" - ");
  if (parts.length < 2) return { campaign: "Unknown campaign", project: value };

  return {
    campaign: parts[0].trim(),
    project: parts.slice(1).join(" - ").trim(),
  };
}

export function parseMilestoneDescription(description: string | undefined): {
  issueTitle: string;
  repoName: string;
  issueUrl: string;
  prUrl: string;
} | null {
  if (!description) return null;

  const parts = description.split("&");
  if (parts.length < 4) return null;

  const prUrl = parts[parts.length - 1].trim();
  const issueUrl = parts[parts.length - 2].trim();
  const repoName = parts[parts.length - 3].trim();
  const issueTitle = parts.slice(0, -3).join("&").trim();

  if (!/^https?:\/\//.test(prUrl) || !/^https?:\/\//.test(issueUrl)) {
    return null;
  }

  return { issueTitle, repoName, issueUrl, prUrl };
}

export function isReleased(milestone: TwMilestone): boolean {
  return milestone.flags?.released === true;
}
import "server-only";
