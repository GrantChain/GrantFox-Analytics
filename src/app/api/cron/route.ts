import { refreshPayments } from "@/features/payments/server/refresh";

export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (provided !== secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const result = await refreshPayments(origin);
  return Response.json(result, { status: result.ok ? 200 : 503 });
}
