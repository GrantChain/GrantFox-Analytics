import { refreshPayments } from "@/features/payments/server/refresh";

export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return Response.json(
      { error: "Revalidation is not configured." },
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

  return Response.json(
    {
      ...result,
      revalidated: result.published ? ["payments", "trustless-work"] : [],
    },
    { status: result.ok ? 200 : 503 },
  );
}
