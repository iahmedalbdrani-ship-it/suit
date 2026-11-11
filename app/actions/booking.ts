"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, rateLimit } from "@/lib/auth";
import { bookingForm, firstError } from "@/lib/validation";
import { db, nowIso } from "@/lib/db";
import { getListingBySlug } from "@/lib/data/listings";
import {
  createPendingBooking, getBookingByCode, getPayment, cancelBooking,
  type Booking,
} from "@/lib/data/bookings";
import { startPayment, completeDemoPayment, refundPayment } from "@/lib/payments";
import { todayInRiyadh } from "@/lib/dates";
import { loc, qs, s } from "./_util";

/** Checkout submit: re-validate on the server, hold the dates, then hand over to the payment provider. */
export async function createBookingAction(fd: FormData) {
  const locale = loc(fd);
  const raw = Object.fromEntries(["slug", "checkIn", "checkOut", "guests", "name", "phone", "notes", "agree"].map((k) => [k, fd.get(k) ?? undefined]));
  const slug = s(fd, "slug", 120);
  const back = (error: string, extra: Record<string, string | number> = {}) =>
    redirect(`/${locale}/book/${slug}${qs({ checkIn: s(fd, "checkIn", 10), checkOut: s(fd, "checkOut", 10), guests: s(fd, "guests", 3), error, ...extra })}`);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login${qs({ next: `/${locale}/book/${slug}${qs({ checkIn: s(fd, "checkIn", 10), checkOut: s(fd, "checkOut", 10), guests: s(fd, "guests", 3) })}` })}`);
  if (!rateLimit(`book:${user!.id}`, 10, 10 * 60_000)) back("rate_limited");

  const parsed = bookingForm.safeParse(raw);
  if (!parsed.success) back(firstError(parsed.error));
  const f = parsed.data!;

  const listing = await getListingBySlug(f.slug);
  if (!listing) back("not_found");

  const result = await createPendingBooking({
    listingId: listing!.id, guestId: user!.id, checkIn: f.checkIn, checkOut: f.checkOut, guests: f.guests,
    guestName: f.name, guestPhone: f.phone, notes: f.notes,
  });
  if (!result.ok) back(result.error.code, "n" in result.error ? { n: result.error.n } : {});
  const booking = (result as { ok: true; booking: Booking }).booking;

  const pay = await startPayment(booking, locale);
  if (!pay.ok) {
    await db().prepare("UPDATE bookings SET status = 'payment_failed', hold_expires_at = NULL, updated_at = ? WHERE id = ?").run(nowIso(), booking.id);
    back("payment_unavailable");
  }
  redirect((pay as { url: string }).url);
}

/** Demo gateway buttons. Refuses unless the demo provider is active and the payment belongs to the user. */
export async function demoPayAction(fd: FormData) {
  const locale = loc(fd);
  const user = await getCurrentUser();
  const pay = await getPayment(s(fd, "paymentId", 64));
  if (!user || !pay) redirect(`/${locale}`);
  const booking = (await db().prepare("SELECT * FROM bookings WHERE id = ?").get<Booking>(pay!.booking_id))!;
  if (booking.guest_id !== user!.id) redirect(`/${locale}?error=forbidden`);
  const outcome = s(fd, "outcome", 10) === "success" ? "success" : "fail";
  await completeDemoPayment(pay!.id, outcome);
  redirect(`/${locale}/bookings/${booking.code}`);
}

/** Retry payment: reuse a live hold, otherwise re-check availability and create a fresh hold. */
export async function retryPaymentAction(fd: FormData) {
  const locale = loc(fd);
  const user = await getCurrentUser();
  const code = s(fd, "code", 20);
  const b = await getBookingByCode(code);
  if (!user || !b || b.guest_id !== user.id) redirect(`/${locale}`);
  const booking = b!;
  if (booking.status === "pending_payment" && booking.hold_expires_at && booking.hold_expires_at > nowIso()) {
    const pay = await startPayment(booking, locale);
    if (pay.ok) redirect(pay.url);
    redirect(`/${locale}/bookings/${code}?error=payment_unavailable`);
  }
  if (!["payment_failed", "expired", "pending_payment"].includes(booking.status)) redirect(`/${locale}/bookings/${code}`);
  const slug = (await db().prepare("SELECT slug FROM listings WHERE id = ?").get<{ slug: string }>(booking.listing_id))!.slug;
  if (booking.check_in < todayInRiyadh()) redirect(`/${locale}/apartments/${slug}`);
  const result = await createPendingBooking({
    listingId: booking.listing_id, guestId: user!.id, checkIn: booking.check_in, checkOut: booking.check_out, guests: booking.guests,
    guestName: booking.guest_name, guestPhone: booking.guest_phone, notes: booking.notes ?? "",
  });
  if (!result.ok) redirect(`/${locale}/book/${slug}${qs({ checkIn: booking.check_in, checkOut: booking.check_out, guests: booking.guests, error: result.error.code })}`);
  const fresh = (result as { ok: true; booking: Booking }).booking;
  const pay = await startPayment(fresh, locale);
  if (!pay.ok) redirect(`/${locale}/bookings/${fresh.code}?error=payment_unavailable`);
  redirect((pay as { url: string }).url);
}

export async function guestCancelAction(fd: FormData) {
  const locale = loc(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const code = s(fd, "code", 20);
  const res = await cancelBooking(code, "guest", user!.id);
  if (!res) redirect(`/${locale}/account?error=cannot_cancel`);
  if (res!.paymentId && res!.refund > 0) await refundPayment(res!.paymentId, res!.refund);
  redirect(`/${locale}/account${qs({ tab: "cancelled", ok: "cancelled" })}`);
}

/** Guest review: only the guest of a confirmed booking, only after the stay has ended, once per booking. */
export async function submitReviewAction(fd: FormData) {
  const locale = loc(fd);
  const user = await getCurrentUser();
  const code = s(fd, "code", 20);
  if (!user) redirect(`/${locale}/login`);
  const b = await getBookingByCode(code);
  const back = (q: string) => redirect(`/${locale}/bookings/${code}${q}#review`);
  if (!b || b.guest_id !== user!.id) redirect(`/${locale}`);
  if (b!.status !== "confirmed" || b!.check_out > todayInRiyadh()) back("?error=review_not_allowed");
  const rating = Math.trunc(Number(s(fd, "rating", 2)));
  const comment = s(fd, "comment", 1000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 5) back("?error=review_invalid");
  const author = user!.name.trim().split(/\s+/)[0] || "Guest";
  // booking_id is UNIQUE: a second submit inserts nothing.
  const r = await db().prepare(`INSERT INTO reviews (listing_id, booking_id, author_name, rating, comment, lang)
    SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE booking_id = ?)`)
    .run(b!.listing_id, b!.id, author, rating, comment, locale, b!.id);
  back(r.changes ? "?ok=review_saved" : "?error=review_exists");
}
