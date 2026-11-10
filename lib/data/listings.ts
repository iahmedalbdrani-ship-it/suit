import "server-only";
import { db } from "../db";
import { config } from "../config";
import { addDays, diffDays, isIsoDate, nightsOf, todayInRiyadh } from "../dates";
import { computeQuote, type Quote } from "../pricing";

export const AMENITIES = [
  "wifi", "parking", "ac", "kitchen", "washer", "tv", "pool", "elevator",
  "workspace", "self_checkin", "family", "sea_view", "gym", "coffee", "balcony", "garden",
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const PROPERTY_TYPES = ["apartment", "studio"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type ListingStatus = "pending" | "approved" | "rejected" | "suspended";

export type Listing = {
  id: number; slug: string; host_id: number; status: ListingStatus; review_note: string | null;
  title_ar: string; title_en: string; description_ar: string; description_en: string;
  property_type: PropertyType; city_slug: string; district_ar: string; district_en: string; address: string; lat: number | null; lng: number | null;
  bedrooms: number; beds: number; bathrooms: number; max_guests: number; area_sqm: number | null; amenities: string;
  base_price: number; weekend_price: number | null; cleaning_fee: number; min_nights: number; max_nights: number;
  weekly_discount: number; monthly_discount: number; cancellation_policy: "flexible" | "moderate" | "strict";
  check_in_time: string; check_out_time: string; house_rules_ar: string; house_rules_en: string;
  featured: number; is_demo: number; created_at: string; updated_at: string;
};

export type ListingCard = Pick<Listing,
  "id" | "slug" | "property_type" | "title_ar" | "title_en" | "city_slug" | "district_ar" | "district_en" | "bedrooms" | "beds" | "max_guests" |
  "base_price" | "featured" | "is_demo" | "min_nights" | "created_at" | "status"> & {
  city_ar: string; city_en: string; cover: string | null; rating: number | null; reviews: number; quoteTotal?: number; quoteNights?: number;
};

export type City = { slug: string; name_ar: string; name_en: string; region_ar: string; region_en: string; lat: number; lng: number; listings?: number };

const ACTIVE_BOOKING = `(b.status = 'confirmed' OR (b.status = 'pending_payment' AND b.hold_expires_at > ?))`;

const CARD_SELECT = `
  SELECT l.id, l.slug, l.property_type, l.title_ar, l.title_en, l.city_slug, l.district_ar, l.district_en, l.bedrooms, l.beds, l.max_guests,
         l.base_price, l.featured, l.is_demo, l.min_nights, l.created_at, l.status,
         c.name_ar AS city_ar, c.name_en AS city_en,
         (SELECT url FROM photos p WHERE p.listing_id = l.id ORDER BY p.sort, p.id LIMIT 1) AS cover,
         r.rating AS rating, COALESCE(r.reviews, 0) AS reviews
  FROM listings l
  JOIN cities c ON c.slug = l.city_slug
  LEFT JOIN (SELECT listing_id, ROUND(AVG(rating), 2) AS rating, COUNT(*) AS reviews FROM reviews GROUP BY listing_id) r ON r.listing_id = l.id`;

export async function getCities(): Promise<City[]> {
  return db().prepare(`SELECT c.*, (SELECT COUNT(*) FROM listings l WHERE l.city_slug = c.slug AND l.status = 'approved') AS listings
    FROM cities c ORDER BY c.sort`).all<City>();
}

export async function getCity(slug: string): Promise<City | undefined> {
  return db().prepare("SELECT * FROM cities WHERE slug = ?").get<City>(slug);
}

export async function getFeatured(limit = 8): Promise<ListingCard[]> {
  return db().prepare(`${CARD_SELECT} WHERE l.status = 'approved' ORDER BY l.featured DESC, r.rating DESC, l.id LIMIT ?`).all<ListingCard>(limit);
}

export type SearchParams = {
  city?: string; checkIn?: string; checkOut?: string; guests?: number;
  type?: PropertyType; minPrice?: number; maxPrice?: number; bedrooms?: number; amenities?: string[]; minRating?: number;
  sort?: "recommended" | "price_asc" | "price_desc" | "rating"; page?: number;
};

export const PAGE_SIZE = 12;

export async function searchListings(p: SearchParams): Promise<{ items: ListingCard[]; total: number; pages: number; page: number; datesValid: boolean }> {
  const where: string[] = ["l.status = 'approved'"];
  const args: (string | number)[] = [];
  const now = new Date().toISOString();
  if (p.city) { where.push("l.city_slug = ?"); args.push(p.city); }
  if (p.type && (PROPERTY_TYPES as readonly string[]).includes(p.type)) { where.push("l.property_type = ?"); args.push(p.type); }
  if (p.guests && p.guests > 0) { where.push("l.max_guests >= ?"); args.push(p.guests); }
  if (p.minPrice) { where.push("l.base_price >= ?"); args.push(Math.round(p.minPrice * 100)); }
  if (p.maxPrice) { where.push("l.base_price <= ?"); args.push(Math.round(p.maxPrice * 100)); }
  if (p.bedrooms) { where.push("l.bedrooms >= ?"); args.push(p.bedrooms); }
  if (p.minRating) { where.push("COALESCE(r.rating, 0) >= ?"); args.push(p.minRating); }
  const amenities = (p.amenities ?? []).filter((a) => (AMENITIES as readonly string[]).includes(a));
  if (amenities.length) {
    where.push("NOT EXISTS (SELECT 1 FROM json_each(?) want WHERE want.value NOT IN (SELECT value FROM json_each(l.amenities)))");
    args.push(JSON.stringify(amenities));
  }
  const today = todayInRiyadh();
  const datesValid = !!(p.checkIn && p.checkOut && isIsoDate(p.checkIn) && isIsoDate(p.checkOut) && p.checkIn >= today && p.checkOut > p.checkIn);
  if (datesValid) {
    const nights = diffDays(p.checkIn!, p.checkOut!);
    where.push("l.min_nights <= ? AND l.max_nights >= ?"); args.push(nights, nights);
    where.push(`NOT EXISTS (SELECT 1 FROM bookings b WHERE b.listing_id = l.id AND ${ACTIVE_BOOKING} AND b.check_in < ? AND b.check_out > ?)`);
    args.push(now, p.checkOut!, p.checkIn!);
    where.push("NOT EXISTS (SELECT 1 FROM calendar_days d WHERE d.listing_id = l.id AND d.blocked = 1 AND d.date >= ? AND d.date < ?)");
    args.push(p.checkIn!, p.checkOut!);
  }
  const order = {
    recommended: "l.featured DESC, COALESCE(r.rating,0) DESC, l.id",
    price_asc: "l.base_price ASC, l.id",
    price_desc: "l.base_price DESC, l.id",
    rating: "COALESCE(r.rating,0) DESC, r.reviews DESC, l.id",
  }[p.sort ?? "recommended"];
  const whereSql = where.join(" AND ");
  const total = (await db().prepare(`SELECT COUNT(*) AS n FROM (${CARD_SELECT} WHERE ${whereSql})`).get<{ n: number }>(...args))!.n;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, p.page ?? 1), pages);
  const items = await db().prepare(`${CARD_SELECT} WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all<ListingCard>(...args, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  if (datesValid) {
    await Promise.all(items.map(async (item) => {
      const l = (await getListingById(item.id))!;
      const q = computeQuote(l, p.checkIn!, p.checkOut!, await overridesFor(l.id, p.checkIn!, p.checkOut!), rates());
      item.quoteTotal = q.total;
      item.quoteNights = q.nights;
    }));
  }
  return { items, total, pages, page, datesValid };
}

export async function getListingBySlug(slug: string): Promise<Listing | undefined> {
  return db().prepare("SELECT * FROM listings WHERE slug = ?").get<Listing>(slug);
}
export async function getListingById(id: number): Promise<Listing | undefined> {
  return db().prepare("SELECT * FROM listings WHERE id = ?").get<Listing>(id);
}

export type Photo = { id: number; listing_id: number; url: string; sort: number };
export async function getPhotos(listingId: number): Promise<Photo[]> {
  return db().prepare("SELECT * FROM photos WHERE listing_id = ? ORDER BY sort, id").all<Photo>(listingId);
}
export async function getCover(listingId: number): Promise<string | null> {
  return (await db().prepare("SELECT url FROM photos WHERE listing_id = ? ORDER BY sort, id LIMIT 1").get<{ url: string }>(listingId))?.url ?? null;
}

export type Review = { id: number; author_name: string; rating: number; comment: string; lang: string; created_at: string };
export async function getReviews(listingId: number): Promise<{ items: Review[]; avg: number | null; count: number }> {
  const items = await db().prepare("SELECT id, author_name, rating, comment, lang, created_at FROM reviews WHERE listing_id = ? ORDER BY created_at DESC").all<Review>(listingId);
  const count = items.length;
  const avg = count ? Math.round((items.reduce((s, r) => s + r.rating, 0) / count) * 100) / 100 : null;
  return { items, avg, count };
}

export async function getHostName(hostId: number): Promise<string> {
  return (await db().prepare("SELECT name FROM users WHERE id = ?").get<{ name: string }>(hostId))?.name ?? "";
}

export function parseAmenities(l: Pick<Listing, "amenities">): Amenity[] {
  try {
    const arr = JSON.parse(l.amenities);
    return Array.isArray(arr) ? arr.filter((a): a is Amenity => (AMENITIES as readonly string[]).includes(a)) : [];
  } catch {
    return [];
  }
}

export function rates() {
  return { serviceFeeRate: config.serviceFeeRate, vatRate: config.vatRate };
}

export async function overridesFor(listingId: number, from: string, to: string): Promise<Map<string, number>> {
  const rows = await db().prepare("SELECT date, price FROM calendar_days WHERE listing_id = ? AND price IS NOT NULL AND date >= ? AND date < ?")
    .all<{ date: string; price: number }>(listingId, from, to);
  return new Map(rows.map((r) => [r.date, r.price]));
}

/** Nights that cannot be booked between [from, to). */
export async function unavailableNights(listingId: number, from: string, to: string): Promise<string[]> {
  const now = new Date().toISOString();
  const set = new Set<string>();
  const bookings = await db().prepare(`SELECT check_in, check_out FROM bookings b WHERE b.listing_id = ? AND ${ACTIVE_BOOKING} AND b.check_in < ? AND b.check_out > ?`)
    .all<{ check_in: string; check_out: string }>(listingId, now, to, from);
  for (const b of bookings) for (const d of nightsOf(b.check_in, b.check_out)) if (d >= from && d < to) set.add(d);
  const blocked = await db().prepare("SELECT date FROM calendar_days WHERE listing_id = ? AND blocked = 1 AND date >= ? AND date < ?")
    .all<{ date: string }>(listingId, from, to);
  for (const b of blocked) set.add(b.date);
  return [...set].sort();
}

export type QuoteError =
  | { code: "invalid_dates" | "past_date" | "unavailable" | "not_found" | "not_bookable" }
  | { code: "min_nights" | "max_nights" | "too_many_guests"; n: number };

export type QuoteResult = { ok: true; quote: Quote; listing: Listing } | { ok: false; error: QuoteError };

/** Server-side validation + price for a stay. The ONLY source of truth for totals. */
export async function quoteStay(listing: Listing | undefined, checkIn: unknown, checkOut: unknown, guests: number, opts: { ignoreAvailability?: boolean } = {}): Promise<QuoteResult> {
  if (!listing) return { ok: false, error: { code: "not_found" } };
  if (listing.status !== "approved") return { ok: false, error: { code: "not_bookable" } };
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) return { ok: false, error: { code: "invalid_dates" } };
  if (checkIn < todayInRiyadh()) return { ok: false, error: { code: "past_date" } };
  if (checkIn > addDays(todayInRiyadh(), 365)) return { ok: false, error: { code: "invalid_dates" } };
  const nights = diffDays(checkIn, checkOut);
  if (nights < listing.min_nights) return { ok: false, error: { code: "min_nights", n: listing.min_nights } };
  if (nights > listing.max_nights) return { ok: false, error: { code: "max_nights", n: listing.max_nights } };
  if (!Number.isInteger(guests) || guests < 1 || guests > listing.max_guests) return { ok: false, error: { code: "too_many_guests", n: listing.max_guests } };
  if (!opts.ignoreAvailability && (await unavailableNights(listing.id, checkIn, checkOut)).length) return { ok: false, error: { code: "unavailable" } };
  const quote = computeQuote(listing, checkIn, checkOut, await overridesFor(listing.id, checkIn, checkOut), rates());
  return { ok: true, quote, listing };
}

export function slugify(input: string): string {
  const base = input.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60);
  return base || "apartment";
}

export async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let i = 2;
  while (await db().prepare("SELECT 1 FROM listings WHERE slug = ?").get(slug)) slug = `${slugify(base)}-${i++}`;
  return slug;
}
