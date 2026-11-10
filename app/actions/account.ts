"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, rateLimit } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBookingByCode } from "@/lib/data/bookings";
import { todayInRiyadh } from "@/lib/dates";
import { clientIp, loc, n, qs, s } from "./_util";

export async function profileAction(fd: FormData) {
  const locale = loc(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const name = s(fd, "name", 80);
  const phone = s(fd, "phone", 20).replace(/[^\d+]/g, "");
  if (!name) redirect(`/${locale}/account?tab=profile&error=required`);
  await db().prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").run(name, phone || null, user!.id);
  redirect(`/${locale}/account?tab=profile&ok=saved`);
}

export async function reviewAction(fd: FormData) {
  const locale = loc(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const b = await getBookingByCode(s(fd, "code", 20));
  const rating = Math.trunc(n(fd, "rating"));
  const comment = s(fd, "comment", 1000);
  const ok = b && b.guest_id === user!.id && b.status === "confirmed" && b.check_out <= todayInRiyadh() && rating >= 1 && rating <= 5 && comment.length >= 3;
  if (!ok) redirect(`/${locale}/account?tab=past&error=required`);
  await db().prepare("INSERT OR IGNORE INTO reviews (listing_id, booking_id, author_name, rating, comment, lang) VALUES (?,?,?,?,?,?)")
    .run(b!.listing_id, b!.id, user!.name.split(" ")[0], rating, comment, locale);
  redirect(`/${locale}/account?tab=past&ok=reviewed`);
}

export async function contactAction(fd: FormData) {
  const locale = loc(fd);
  const name = s(fd, "name", 80), email = s(fd, "email", 200), subject = s(fd, "subject", 150), body = s(fd, "message", 4000);
  if (s(fd, "website", 100)) redirect(`/${locale}/contact?ok=1`); // honeypot
  if (!rateLimit(`contact:${await clientIp()}`, 5, 60 * 60_000)) redirect(`/${locale}/contact?error=rate_limited`);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !body) redirect(`/${locale}/contact${qs({ error: "required" })}`);
  await db().prepare("INSERT INTO messages (name, email, subject, body) VALUES (?,?,?,?)").run(name, email, subject || "-", body);
  redirect(`/${locale}/contact?ok=1`);
}

/** A signed-in guest can switch on hosting for their account. */
export async function becomeHostAction(fd: FormData) {
  const locale = loc(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/register?host=1`);
  if (user!.role === "guest") await db().prepare("UPDATE users SET role = 'host' WHERE id = ?").run(user!.id);
  redirect(`/${locale}/host/listings/new`);
}
