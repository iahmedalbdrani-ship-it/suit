import "server-only";
import { db, nowIso } from "../db";
import { config } from "../config";
import { getListingById, quoteStay, type Listing, type QuoteError } from "./listings";
import { refundFor, type Quote } from "../pricing";
import { todayInRiyadh } from "../dates";

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "expired" | "payment_failed" | "payment_conflict";

export type Booking = {
  id: number; code: string; listing_id: number; guest_id: number; check_in: string; check_out: string; nights: number; guests: number;
  guest_name: string; guest_phone: string; notes: string | null; status: BookingStatus; hold_expires_at: string | null;
  price_json: string; total: number; currency: string; cancellation_policy: "flexible" | "moderate" | "strict";
  cancelled_by: string | null; cancelled_at: string | null; refund_amount: number | null; created_at: string; updated_at: string;
};

export type BookingWithListing = Booking & {
  slug: string; title_ar: string; title_en: string; city_ar: string; city_en: string; district_ar: string; district_en: string;
  cover: string | null; host_id: number; check_in_time: string; check_out_time: string; address: string;
  guest_email?: string; host_name?: string; is_demo: number;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `SU-${s}`;
}

/** Release holds whose payment window has passed. */
export async function expireStaleHolds() {
  await db().prepare("UPDATE bookings SET status = 'expired', updated_at = ? WHERE status = 'pending_payment' AND hold_expires_at <= ?").run(nowIso(), nowIso());
}

export type CreateBookingInput = {
  listingId: number; guestId: number; checkIn: string; checkOut: string; guests: number; guestName: string; guestPhone: string; notes?: string;
};

/**
 * Re-validates availability and price, then holds the dates with ONE conditional INSERT … SELECT.
 * A single SQL statement is atomic on both D1 and SQLite, so two guests can never hold the same nights:
 * if another active booking or a host-blocked day overlaps, the INSERT inserts zero rows.
 */
export async function createPendingBooking(input: CreateBookingInput): Promise<{ ok: true; booking: Booking } | { ok: false; error: QuoteError }> {
  const listing = await getListingById(input.listingId);
  const result = await quoteStay(listing, input.checkIn, input.checkOut, input.guests);
  if (!result.ok) return { ok: false, error: result.error };
  const q = result.quote;
  const now = nowIso();
  const hold = new Date(Date.now() + config.holdMinutes * 60_000).toISOString();
  const code = newCode();
  const r = await db().prepare(`INSERT INTO bookings (code, listing_id, guest_id, check_in, check_out, nights, guests, guest_name, guest_phone, notes, status,
      hold_expires_at, price_json, total, currency, cancellation_policy)
    SELECT ?,?,?,?,?,?,?,?,?,?,'pending_payment',?,?,?,?,?
    WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.listing_id = ? AND (b.status = 'confirmed' OR (b.status = 'pending_payment' AND b.hold_expires_at > ?))
                      AND b.check_in < ? AND b.check_out > ?)
      AND NOT EXISTS (SELECT 1 FROM calendar_days d WHERE d.listing_id = ? AND d.blocked = 1 AND d.date >= ? AND d.date < ?)`)
    .run(code, input.listingId, input.guestId, input.checkIn, input.checkOut, q.nights, input.guests, input.guestName, input.guestPhone,
      input.notes || null, hold, JSON.stringify(q), q.total, q.currency, listing!.cancellation_policy,
      input.listingId, now, input.checkOut, input.checkIn,
      input.listingId, input.checkIn, input.checkOut);
  if (r.changes === 0) return { ok: false, error: { code: "unavailable" } };
  return { ok: true, booking: (await getBookingByCode(code))! };
}

export async function getBookingByCode(code: string): Promise<Booking | undefined> {
  return db().prepare("SELECT * FROM bookings WHERE code = ?").get<Booking>(code);
}

const WITH_LISTING = `
  SELECT b.*, l.slug, l.title_ar, l.title_en, l.district_ar, l.district_en, l.host_id, l.check_in_time, l.check_out_time, l.address, l.is_demo,
         c.name_ar AS city_ar, c.name_en AS city_en, g.email AS guest_email, h.name AS host_name,
         (SELECT url FROM photos p WHERE p.listing_id = l.id ORDER BY p.sort, p.id LIMIT 1) AS cover
  FROM bookings b JOIN listings l ON l.id = b.listing_id JOIN cities c ON c.slug = l.city_slug
  JOIN users g ON g.id = b.guest_id JOIN users h ON h.id = l.host_id`;

export async function getBookingDetail(code: string): Promise<BookingWithListing | undefined> {
  return db().prepare(`${WITH_LISTING} WHERE b.code = ?`).get<BookingWithListing>(code);
}

export async function bookingsForGuest(guestId: number): Promise<BookingWithListing[]> {
  await expireStaleHolds();
  return db().prepare(`${WITH_LISTING} WHERE b.guest_id = ? ORDER BY b.check_in DESC`).all<BookingWithListing>(guestId);
}

export async function bookingsForHost(hostId: number, listingId?: number): Promise<BookingWithListing[]> {
  await expireStaleHolds();
  if (listingId) return db().prepare(`${WITH_LISTING} WHERE l.host_id = ? AND l.id = ? AND b.status IN ('confirmed','cancelled','pending_payment','payment_conflict') ORDER BY b.check_in DESC`).all<BookingWithListing>(hostId, listingId);
  return db().prepare(`${WITH_LISTING} WHERE l.host_id = ? AND b.status IN ('confirmed','cancelled','pending_payment','payment_conflict') ORDER BY b.check_in DESC`).all<BookingWithListing>(hostId);
}

export async function allBookings(status?: string): Promise<BookingWithListing[]> {
  await expireStaleHolds();
  if (status) return db().prepare(`${WITH_LISTING} WHERE b.status = ? ORDER BY b.created_at DESC LIMIT 300`).all<BookingWithListing>(status);
  return db().prepare(`${WITH_LISTING} ORDER BY b.created_at DESC LIMIT 300`).all<BookingWithListing>();
}

export function quoteOf(b: Pick<Booking, "price_json">): Quote {
  return JSON.parse(b.price_json) as Quote;
}

export function isUpcoming(b: Pick<Booking, "check_out" | "status">): boolean {
  return b.check_out > todayInRiyadh() && ["confirmed", "pending_payment", "payment_conflict"].includes(b.status);
}

export function guestRefundPreview(b: BookingWithListing): number {
  return refundFor(b.cancellation_policy, b.total, b.check_in, b.check_in_time);
}

/* ───────── Payments ───────── */

export type Payment = {
  id: string; booking_id: number; provider: string; provider_ref: string | null; provider_payment_id: string | null; amount: number; currency: string;
  status: "initiated" | "paid" | "failed" | "expired" | "refunded" | "refund_pending"; checkout_url: string | null; raw: string | null; created_at: string;
};

const hexId = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function createPaymentRecord(bookingId: number, provider: string, amount: number): Promise<Payment> {
  const id = `pay_${hexId(12)}`;
  await db().prepare("INSERT INTO payments (id, booking_id, provider, amount, currency, status) VALUES (?,?,?,?, 'SAR', 'initiated')").run(id, bookingId, provider, amount);
  return (await getPayment(id))!;
}

export async function updatePayment(id: string, fields: Partial<Pick<Payment, "provider_ref" | "provider_payment_id" | "status" | "checkout_url" | "raw">>) {
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  await db().prepare(`UPDATE payments SET ${sets}, updated_at = ? WHERE id = ?`).run(...keys.map((k) => (fields[k] ?? null) as string | null), nowIso(), id);
}

export async function getPayment(id: string): Promise<Payment | undefined> {
  return db().prepare("SELECT * FROM payments WHERE id = ?").get<Payment>(id);
}

export async function latestPayment(bookingId: number): Promise<Payment | undefined> {
  return db().prepare("SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1").get<Payment>(bookingId);
}

/**
 * Called only after the provider has been verified server-side.
 * Idempotent: paying twice never double-confirms. If the hold expired and someone else took the
 * dates meanwhile, the booking is flagged for a refund instead of creating a double booking.
 * All three writes run as one atomic batch, with the conflict decision made inside SQL.
 */
export async function markPaymentPaid(paymentId: string, providerPaymentId: string | null, raw: unknown): Promise<BookingStatus | null> {
  const pay = await getPayment(paymentId);
  if (!pay) return null;
  const before = await db().prepare("SELECT * FROM bookings WHERE id = ?").get<Booking>(pay.booking_id);
  if (!before) return null;
  if (pay.status === "paid") return before.status;
  const now = nowIso();
  await db().batch([
    db().prepare("UPDATE payments SET status = 'paid', provider_payment_id = ?, raw = ?, updated_at = ? WHERE id = ? AND status <> 'paid'")
      .bind(providerPaymentId, JSON.stringify(raw ?? null), now, paymentId),
    db().prepare(`UPDATE bookings SET hold_expires_at = NULL, updated_at = ?,
      status = CASE
        WHEN status = 'cancelled' THEN 'payment_conflict'
        WHEN status = 'pending_payment' AND hold_expires_at > ? THEN 'confirmed'
        WHEN NOT EXISTS (SELECT 1 FROM bookings o WHERE o.listing_id = bookings.listing_id AND o.id <> bookings.id
                         AND (o.status = 'confirmed' OR (o.status = 'pending_payment' AND o.hold_expires_at > ?))
                         AND o.check_in < bookings.check_out AND o.check_out > bookings.check_in)
             AND NOT EXISTS (SELECT 1 FROM calendar_days d WHERE d.listing_id = bookings.listing_id AND d.blocked = 1
                             AND d.date >= bookings.check_in AND d.date < bookings.check_out)
          THEN 'confirmed'
        ELSE 'payment_conflict' END
      WHERE id = ? AND status <> 'confirmed'`).bind(now, now, now, pay.booking_id),
    db().prepare("UPDATE payments SET status = 'refund_pending', updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'payment_conflict')")
      .bind(now, paymentId, pay.booking_id),
  ]);
  return (await db().prepare("SELECT status FROM bookings WHERE id = ?").get<{ status: BookingStatus }>(pay.booking_id))?.status ?? null;
}

export async function markPaymentFailed(paymentId: string, status: "failed" | "expired", raw: unknown) {
  const now = nowIso();
  await db().batch([
    db().prepare(`UPDATE bookings SET status = 'payment_failed', hold_expires_at = NULL, updated_at = ?
      WHERE status = 'pending_payment' AND id = (SELECT booking_id FROM payments WHERE id = ? AND status = 'initiated')`).bind(now, paymentId),
    db().prepare("UPDATE payments SET status = ?, raw = ?, updated_at = ? WHERE id = ? AND status = 'initiated'").bind(status, JSON.stringify(raw ?? null), now, paymentId),
  ]);
}

/** Cancel a booking. Returns the refund amount (halalas) or null if not allowed. */
export async function cancelBooking(code: string, by: "guest" | "host" | "admin", actorId: number): Promise<{ refund: number; paymentId: string | null } | null> {
  const b = await db().prepare(`SELECT b.*, l.host_id, l.check_in_time FROM bookings b JOIN listings l ON l.id = b.listing_id WHERE b.code = ?`)
    .get<Booking & { host_id: number; check_in_time: string }>(code);
  if (!b) return null;
  if (by === "guest" && b.guest_id !== actorId) return null;
  if (by === "host" && b.host_id !== actorId) return null;
  const at = nowIso();
  if (b.status === "pending_payment") {
    const [r] = await db().batch([
      db().prepare("UPDATE bookings SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, refund_amount = 0, hold_expires_at = NULL, updated_at = ? WHERE id = ? AND status = 'pending_payment'")
        .bind(by, at, at, b.id),
    ]);
    return r.changes ? { refund: 0, paymentId: null } : null;
  }
  if (b.status !== "confirmed" || b.check_out <= todayInRiyadh()) return null;
  const refund = by === "guest" ? refundFor(b.cancellation_policy, b.total, b.check_in, b.check_in_time) : b.total;
  const pay = await db().prepare("SELECT id FROM payments WHERE booking_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 1").get<{ id: string }>(b.id);
  const stmts = [
    db().prepare("UPDATE bookings SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, refund_amount = ?, updated_at = ? WHERE id = ? AND status = 'confirmed'")
      .bind(by, at, refund, at, b.id),
  ];
  if (pay && refund > 0) {
    stmts.push(db().prepare("UPDATE payments SET status = 'refund_pending', updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'cancelled' AND cancelled_at = ?)")
      .bind(at, pay.id, b.id, at));
  }
  const [r] = await db().batch(stmts);
  return r.changes ? { refund, paymentId: pay?.id ?? null } : null;
}

export async function listingOf(b: Booking): Promise<Listing | undefined> {
  return getListingById(b.listing_id);
}
