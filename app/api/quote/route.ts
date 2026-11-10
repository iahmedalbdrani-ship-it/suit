import { NextResponse } from "next/server";
import { getListingBySlug, quoteStay } from "@/lib/data/listings";
import { rateLimit } from "@/lib/auth";
import { quoteQuery, firstError } from "@/lib/validation";

const ipOf = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** GET /api/quote?slug=&checkIn=&checkOut=&guests= — the server is the only source of truth for prices. */
export async function GET(req: Request) {
  if (!rateLimit(`quote:${ipOf(req)}`, 120, 60_000)) return json({ ok: false, error: { code: "rate_limited" } }, 429);
  const parsed = quoteQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return json({ ok: false, error: { code: firstError(parsed.error) } }, 400);
  const { slug, checkIn, checkOut, guests } = parsed.data;
  const r = await quoteStay(await getListingBySlug(slug), checkIn, checkOut, guests);
  if (!r.ok) return json({ ok: false, error: r.error });
  return json({ ok: true, quote: r.quote });
}
