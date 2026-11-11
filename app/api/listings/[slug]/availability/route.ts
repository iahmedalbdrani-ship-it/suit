import { NextResponse } from "next/server";
import { getListingBySlug, unavailableNights } from "@/lib/data/listings";
import { addDays, todayInRiyadh } from "@/lib/dates";
import { rateLimit } from "@/lib/auth";
import { expireStaleHolds } from "@/lib/data/bookings";
import { slug as slugSchema } from "@/lib/validation";

/** GET /api/listings/:slug/availability — booked or blocked nights for the next 12 months. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!rateLimit(`avail:${ip}`, 120, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = slugSchema.safeParse((await ctx.params).slug);
  const listing = parsed.success ? await getListingBySlug(parsed.data) : undefined;
  if (!listing || listing.status !== "approved" || listing.paused) return NextResponse.json({ ok: false }, { status: 404 });
  await expireStaleHolds();
  const from = todayInRiyadh();
  const to = addDays(from, 366);
  return NextResponse.json(
    { ok: true, from, to, unavailable: await unavailableNights(listing.id, from, to), minNights: listing.min_nights },
    { headers: { "Cache-Control": "no-store" } },
  );
}
