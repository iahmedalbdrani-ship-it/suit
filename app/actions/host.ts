"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, type User } from "@/lib/auth";
import { db, nowIso } from "@/lib/db";
import { putObject, deleteObject } from "@/lib/storage";
import { AMENITIES, PROPERTY_TYPES, getCity, getListingById, uniqueSlug, type Listing } from "@/lib/data/listings";
import { cancelBooking } from "@/lib/data/bookings";
import { refundPayment } from "@/lib/payments";
import { addDays, diffDays, isIsoDate } from "@/lib/dates";
import { loc, moneyField, n, qs, s } from "./_util";

async function requireHost(locale: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user!.role !== "host" && user!.role !== "admin") redirect(`/${locale}?error=forbidden`);
  return user!;
}

async function ownListing(user: User, id: number, locale: string): Promise<Listing> {
  const l = await getListingById(id);
  if (!l || (l.host_id !== user.id && user.role !== "admin")) redirect(`/${locale}/host?error=forbidden`);
  return l!;
}

const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.trunc(v || 0)));
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveListingAction(fd: FormData) {
  const locale = loc(fd);
  const user = await requireHost(locale);
  const id = Math.trunc(n(fd, "id", 0));
  const existing = id ? await ownListing(user, id, locale) : null;
  const back = (error: string) => redirect(existing ? `/${locale}/host/listings/${id}${qs({ error })}` : `/${locale}/host/listings/new${qs({ error })}`);

  const title_ar = s(fd, "title_ar", 120);
  const title_en = s(fd, "title_en", 120);
  const city = s(fd, "city_slug", 40);
  const base = moneyField(fd, "base_price");
  if (!title_ar || !title_en || !(await getCity(city))) back("required");
  if (!base || base < 1000) back("invalid_price");
  const latRaw = s(fd, "lat", 20), lngRaw = s(fd, "lng", 20);
  const cityRow = (await getCity(city))!;
  const lat = latRaw && Number.isFinite(Number(latRaw)) ? Number(latRaw) : cityRow.lat;
  const lng = lngRaw && Number.isFinite(Number(lngRaw)) ? Number(lngRaw) : cityRow.lng;
  const amenities = fd.getAll("amenities").map(String).filter((a) => (AMENITIES as readonly string[]).includes(a));
  const policy = ["flexible", "moderate", "strict"].includes(s(fd, "cancellation_policy")) ? s(fd, "cancellation_policy") : "moderate";
  const minN = clampInt(n(fd, "min_nights", 1), 1, 60);
  const values = {
    title_ar, title_en,
    description_ar: s(fd, "description_ar", 4000), description_en: s(fd, "description_en", 4000),
    city_slug: city, district_ar: s(fd, "district_ar", 80), district_en: s(fd, "district_en", 80), address: s(fd, "address", 300),
    lat, lng,
    unit_type: (PROPERTY_TYPES as readonly string[]).includes(s(fd, "unit_type")) ? s(fd, "unit_type") : "apartment",
    bedrooms: clampInt(n(fd, "bedrooms"), 0, 20), beds: clampInt(n(fd, "beds", 1), 1, 40), bathrooms: clampInt(n(fd, "bathrooms", 1), 1, 20),
    max_guests: clampInt(n(fd, "max_guests", 2), 1, 30), area_sqm: clampInt(n(fd, "area_sqm"), 0, 5000) || null,
    amenities: JSON.stringify(amenities),
    base_price: base!, weekend_price: moneyField(fd, "weekend_price") || null, cleaning_fee: moneyField(fd, "cleaning_fee") ?? 0,
    min_nights: minN, max_nights: clampInt(n(fd, "max_nights", 30), minN, 365),
    weekly_discount: clampInt(n(fd, "weekly_discount"), 0, 60), monthly_discount: clampInt(n(fd, "monthly_discount"), 0, 70),
    cancellation_policy: policy,
    check_in_time: TIME.test(s(fd, "check_in_time")) ? s(fd, "check_in_time") : "15:00",
    check_out_time: TIME.test(s(fd, "check_out_time")) ? s(fd, "check_out_time") : "12:00",
    house_rules_ar: s(fd, "house_rules_ar", 2000), house_rules_en: s(fd, "house_rules_en", 2000),
  };
  const cols = Object.keys(values) as (keyof typeof values)[];
  const vals = cols.map((c) => values[c] as string | number | null);

  if (existing) {
    // Rejected listings go back to review after edits.
    const status = existing.status === "rejected" ? "pending" : existing.status;
    await db().prepare(`UPDATE listings SET ${cols.map((c) => `${c} = ?`).join(", ")}, status = ?, updated_at = ? WHERE id = ?`).run(...vals, status, nowIso(), id);
    revalidatePath(`/${locale}/host/listings/${id}`);
    redirect(`/${locale}/host/listings/${id}?ok=saved`);
  }
  const slug = await uniqueSlug(`${city}-${title_en}`);
  const r = await db().prepare(`INSERT INTO listings (slug, host_id, status, is_demo, ${cols.join(", ")}) VALUES (?, ?, 'pending', 0, ${cols.map(() => "?").join(", ")})`)
    .run(slug, user.id, ...vals);
  const photoRes = photoFiles(fd).length ? await savePhotos(Number(r.lastInsertRowid), photoFiles(fd)) : "ok";
  if (photoRes !== "ok") redirect(`/${locale}/host/listings/${r.lastInsertRowid}?error=${photoRes}#photos`);
  redirect(`/${locale}/host/listings/${r.lastInsertRowid}?ok=created#photos`);
}

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 20;
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
function sniff(buf: Uint8Array): "jpg" | "png" | "webp" | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((v, i) => buf[i] === v)) return "png";
  const tag = (from: number, to: number) => String.fromCharCode(...buf.subarray(from, to));
  if (tag(0, 4) === "RIFF" && tag(8, 12) === "WEBP") return "webp";
  return null;
}

/**
 * Validates every file first (declared type, real content type by magic bytes, size) and only then stores them,
 * so one bad file never leaves a half-uploaded set. Order of `files` = order of display.
 */
async function savePhotos(listingId: number, files: File[]): Promise<"ok" | "upload_invalid" | "upload_too_large" | "upload_limit"> {
  if (!files.length) return "upload_invalid";
  const existing = (await db().prepare("SELECT COUNT(*) AS n, MAX(sort) AS m FROM photos WHERE listing_id = ?").get<{ n: number; m: number | null }>(listingId))!;
  if (existing.n + files.length > MAX_PHOTOS) return "upload_limit";
  const checked: { buf: Uint8Array; ext: "jpg" | "png" | "webp" }[] = [];
  for (const f of files) {
    if (f.size > MAX_BYTES) return "upload_too_large";
    if (f.type && !Object.values(MIME).includes(f.type as (typeof MIME)[keyof typeof MIME])) return "upload_invalid";
    const buf = new Uint8Array(await f.arrayBuffer());
    if (buf.length > MAX_BYTES) return "upload_too_large";
    const ext = sniff(buf);
    if (!ext) return "upload_invalid";
    checked.push({ buf, ext });
  }
  let sort = (existing.m ?? -1) + 1;
  for (const { buf, ext } of checked) {
    const name = `${[...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("")}.${ext}`;
    await putObject(name, buf, MIME[ext]);
    await db().prepare("INSERT INTO photos (listing_id, url, sort) VALUES (?,?,?)").run(listingId, `/uploads/${name}`, sort++);
  }
  return "ok";
}

const photoFiles = (fd: FormData) => fd.getAll("photos").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f && f.size > 0);

export async function uploadPhotosAction(fd: FormData) {
  const locale = loc(fd);
  const user = await requireHost(locale);
  const id = Math.trunc(n(fd, "id"));
  await ownListing(user, id, locale);
  const res = await savePhotos(id, photoFiles(fd));
  if (res !== "ok") redirect(`/${locale}/host/listings/${id}?error=${res}#photos`);
  redirect(`/${locale}/host/listings/${id}?ok=saved#photos`);
}

export async function photoAction(fd: FormData) {
  const locale = loc(fd);
  const user = await requireHost(locale);
  const id = Math.trunc(n(fd, "id"));
  await ownListing(user, id, locale);
  const photoId = Math.trunc(n(fd, "photoId"));
  const op = s(fd, "op", 10);
  const photo = await db().prepare("SELECT * FROM photos WHERE id = ? AND listing_id = ?").get<{ url: string }>(photoId, id);
  if (photo && op === "delete") {
    await db().prepare("DELETE FROM photos WHERE id = ?").run(photoId);
    const m = /^\/uploads\/([a-f0-9]{32}\.\w+)$/.exec(photo.url);
    if (m) await deleteObject(m[1]);
  }
  if (photo && (op === "cover" || op === "left" || op === "right")) {
    const ids = (await db().prepare("SELECT id FROM photos WHERE listing_id = ? ORDER BY sort, id").all<{ id: number }>(id)).map((r) => r.id);
    const i = ids.indexOf(photoId);
    if (op === "cover") { ids.splice(i, 1); ids.unshift(photoId); }
    else {
      const j = op === "left" ? i - 1 : i + 1;
      if (j >= 0 && j < ids.length) [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    await db().batch(ids.map((pid, k) => db().prepare("UPDATE photos SET sort = ? WHERE id = ? AND listing_id = ?").bind(k, pid, id)));
  }
  redirect(`/${locale}/host/listings/${id}?ok=saved#photos`);
}

/** Pause / unpause a listing: a paused listing disappears from search and cannot be booked; existing bookings are untouched. */
export async function togglePauseAction(fd: FormData) {
  const locale = loc(fd);
  const user = await requireHost(locale);
  const id = Math.trunc(n(fd, "id"));
  const listing = await ownListing(user, id, locale);
  await db().prepare("UPDATE listings SET paused = ?, updated_at = ? WHERE id = ?").run(listing.paused ? 0 : 1, nowIso(), id);
  revalidatePath(`/${locale}/search`);
  redirect(s(fd, "back", 12) === "list" ? `/${locale}/host?tab=listings&ok=${listing.paused ? "unpaused" : "paused"}` : `/${locale}/host/listings/${id}?ok=${listing.paused ? "unpaused" : "paused"}`);
}

export async function calendarAction(fd: FormData) {
  const locale = loc(fd);
  const user = await requireHost(locale);
  const id = Math.trunc(n(fd, "id"));
  await ownListing(user, id, locale);
  const from = s(fd, "from", 10);
  const to = s(fd, "to", 10) || from;
  const op = s(fd, "op", 12);
  const dest = `/${locale}/host/listings/${id}`;
  if (!isIsoDate(from) || !isIsoDate(to) || to < from || diffDays(from, to) > 366) redirect(`${dest}?error=invalid_dates#calendar`);
  const price = moneyField(fd, "price");
  if (op === "price" && (!price || price < 1000)) redirect(`${dest}?error=invalid_price#calendar`);
  // One set-based statement per operation (works on D1's per-request query limits).
  const range = "WITH RECURSIVE r(d) AS (SELECT ? UNION ALL SELECT date(d, '+1 day') FROM r WHERE d < ?)";
  const upsert = (blocked: string, priceExpr: string, update: string) =>
    `${range} INSERT INTO calendar_days (listing_id, date, blocked, price) SELECT ?, d, ${blocked}, ${priceExpr} FROM r WHERE true
     ON CONFLICT(listing_id, date) DO UPDATE SET ${update}`;
  const stmts = {
    block: db().prepare(upsert("1", "NULL", "blocked = 1")).bind(from, to, id),
    unblock: db().prepare(upsert("0", "NULL", "blocked = 0")).bind(from, to, id),
    price: db().prepare(upsert("0", "?", "price = excluded.price")).bind(from, to, id, price),
    clear: db().prepare(upsert("0", "NULL", "price = NULL")).bind(from, to, id),
  };
  const chosen = stmts[op as keyof typeof stmts];
  if (chosen) await db().batch([chosen, db().prepare("DELETE FROM calendar_days WHERE listing_id = ? AND blocked = 0 AND price IS NULL").bind(id)]);
  redirect(`${dest}?ok=calendar#calendar`);
}

export async function hostCancelAction(fd: FormData) {
  const locale = loc(fd);
  const user = await requireHost(locale);
  const res = await cancelBooking(s(fd, "code", 20), "host", user.id);
  if (!res) redirect(`/${locale}/host?tab=bookings&error=cannot_cancel`);
  if (res!.paymentId && res!.refund > 0) await refundPayment(res!.paymentId, res!.refund);
  redirect(`/${locale}/host?tab=bookings&ok=host_cancelled`);
}
