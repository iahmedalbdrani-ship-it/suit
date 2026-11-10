"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db, nowIso } from "@/lib/db";
import { cancelBooking, getPayment, updatePayment } from "@/lib/data/bookings";
import { refundPayment } from "@/lib/payments";
import { loc, n, qs, s } from "./_util";

async function requireAdmin(locale: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect(`/${locale}?error=forbidden`);
  return user!;
}

export async function listingStatusAction(fd: FormData) {
  const locale = loc(fd);
  await requireAdmin(locale);
  const status = s(fd, "status", 12);
  if (!["approved", "rejected", "suspended", "pending"].includes(status)) redirect(`/${locale}/admin?tab=listings`);
  await db().prepare("UPDATE listings SET status = ?, review_note = ?, updated_at = ? WHERE id = ?").run(status, s(fd, "note", 500) || null, nowIso(), Math.trunc(n(fd, "id")));
  redirect(`/${locale}/admin${qs({ tab: "listings", ok: "1", filter: s(fd, "filter", 12) })}`);
}

export async function roleAction(fd: FormData) {
  const locale = loc(fd);
  const admin = await requireAdmin(locale);
  const id = Math.trunc(n(fd, "id"));
  const role = s(fd, "role", 8);
  if (id !== admin.id && ["guest", "host", "admin"].includes(role)) await db().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  redirect(`/${locale}/admin?tab=users&ok=1`);
}

export async function messageAction(fd: FormData) {
  const locale = loc(fd);
  await requireAdmin(locale);
  await db().prepare("UPDATE messages SET handled = 1 WHERE id = ?").run(Math.trunc(n(fd, "id")));
  redirect(`/${locale}/admin?tab=messages&ok=1`);
}

export async function adminCancelAction(fd: FormData) {
  const locale = loc(fd);
  const admin = await requireAdmin(locale);
  const res = await cancelBooking(s(fd, "code", 20), "admin", admin.id);
  if (res?.paymentId && res.refund > 0) await refundPayment(res.paymentId, res.refund);
  redirect(`/${locale}/admin?tab=bookings&ok=1`);
}

/** Retry a provider refund, or record that it was refunded manually from the gateway dashboard. */
export async function refundAction(fd: FormData) {
  const locale = loc(fd);
  await requireAdmin(locale);
  const pay = await getPayment(s(fd, "paymentId", 64));
  if (pay && pay.status === "refund_pending") {
    const b = (await db().prepare("SELECT refund_amount, total, status FROM bookings WHERE id = ?").get<{ refund_amount: number | null; total: number; status: string }>(pay.booking_id))!;
    const amount = b.status === "payment_conflict" ? b.total : b.refund_amount ?? 0;
    if (s(fd, "mode", 8) === "manual") await updatePayment(pay.id, { status: "refunded" });
    else await refundPayment(pay.id, amount);
  }
  redirect(`/${locale}/admin?tab=bookings&ok=1`);
}
