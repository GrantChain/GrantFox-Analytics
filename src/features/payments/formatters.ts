const usdc = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(value: number): string {
  return usdc.format(value ?? 0);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function trustlessWorkViewerUrl(escrowId: string): string {
  return `https://viewer.trustlesswork.com/mainnet/${encodeURIComponent(escrowId)}`;
}

// Restrict user-controlled avatar URLs to trusted hosts to prevent tracking pixels.
export function safeAvatarUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return undefined;

    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === "avatars.githubusercontent.com" ||
      host === "supabase.co" ||
      host.endsWith(".supabase.co");

    return allowed ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function grantfoxProfileUrl(username: string): string {
  return `https://contribute.grantfox.xyz//public/profile/${encodeURIComponent(username)}`;
}

export function grantfoxOrganizationUrl(organization: string): string {
  return `https://contribute.grantfox.xyz/org/${encodeURIComponent(organization)}`;
}
