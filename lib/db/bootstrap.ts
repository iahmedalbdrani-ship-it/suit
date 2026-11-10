import "server-only";
import type { Db } from "./index";
import { config, DEMO_ACCOUNTS, DEMO_PASSWORD } from "../config";
import { CITIES, LISTINGS, REVIEW_POOL, REVIEWERS } from "./seed-data";
import { hashPassword } from "../password";
import { addDays, todayInRiyadh } from "../dates";
import { computeQuote } from "../pricing";

export async function bootstrap(db: Db) {
  const one = async <T>(sql: string, ...a: unknown[]) => db.prepare(sql).get<T>(...a);
  if (config.adminEmail && config.adminPassword) {
    const exists = await one("SELECT id FROM users WHERE email = ?", config.adminEmail);
    if (!exists) {
      await db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
        .run("Suitly Admin", config.adminEmail, await hashPassword(config.adminPassword));
    }
  }
  const cityCount = (await one<{ c: number }>("SELECT COUNT(*) AS c FROM cities"))!.c;
  if (cityCount === 0) {
    const ins = db.prepare("INSERT INTO cities (slug, name_ar, name_en, region_ar, region_en, lat, lng, sort) VALUES (?,?,?,?,?,?,?,?)");
    await db.batch(CITIES.map((c, i) => ins.bind(c.slug, c.name_ar, c.name_en, c.region_ar, c.region_en, c.lat, c.lng, i)));
  }
  const listingCount = (await one<{ c: number }>("SELECT COUNT(*) AS c FROM listings"))!.c;
  if (listingCount === 0 && config.seedDemoData) await seedDemo(db);
}

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

async function seedDemo(db: Db) {
  const pw = await hashPassword(DEMO_PASSWORD);
  const addUser = db.prepare("INSERT OR IGNORE INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)");
  const idOf = async (email: string) => (await db.prepare("SELECT id FROM users WHERE email = ?").get<{ id: number }>(email))!.id;
  const locked = await hashPassword(crypto.randomUUID());
  await db.batch([
    addUser.bind("ضيف تجريبي", DEMO_ACCOUNTS.guest, "0500000001", pw, "guest"),
    addUser.bind("فيصل (مضيف تجريبي)", DEMO_ACCOUNTS.host, "0500000002", pw, "host"),
    addUser.bind("مدير تجريبي", DEMO_ACCOUNTS.admin, "0500000003", pw, "admin"),
    addUser.bind("نورة", "host2@demo.suitly.online", null, locked, "host"),
    addUser.bind("سلطان", "host3@demo.suitly.online", null, locked, "host"),
  ]);
  const hosts = [await idOf(DEMO_ACCOUNTS.host), await idOf("host2@demo.suitly.online"), await idOf("host3@demo.suitly.online")];
  const guestId = await idOf(DEMO_ACCOUNTS.guest);

  const insListing = db.prepare(`INSERT INTO listings (slug, host_id, status, title_ar, title_en, description_ar, description_en, city_slug,
    district_ar, district_en, address, lat, lng, bedrooms, beds, bathrooms, max_guests, area_sqm, amenities, base_price, weekend_price,
    cleaning_fee, min_nights, max_nights, weekly_discount, monthly_discount, cancellation_policy, house_rules_ar, house_rules_en, featured, is_demo)
    VALUES (?,?,'approved',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,30,?,?,?,?,?,?,1)`);
  const insPhoto = db.prepare("INSERT INTO photos (listing_id, url, sort) VALUES (?,?,?)");
  const insReview = db.prepare("INSERT INTO reviews (listing_id, author_name, rating, comment, lang, created_at) VALUES (?,?,?,?,?,?)");
  const scenes = ["living", "bedroom", "kitchen", "bath", "view"];
  const today = todayInRiyadh();
  const ids: number[] = [];

  for (const [idx, l] of LISTINGS.entries()) {
    const city = CITIES.find((c) => c.slug === l.city)!;
    const r = await insListing.run(
      l.slug, hosts[l.host], l.title_ar, l.title_en, l.desc_ar, l.desc_en, l.city, l.district_ar, l.district_en,
      `عنوان تجريبي — ${l.district_ar}، ${city.name_ar}`, city.lat + l.dLat, city.lng + l.dLng,
      l.bedrooms, l.beds, l.bathrooms, l.max_guests, l.area, JSON.stringify(l.amenities),
      l.price * 100, l.weekend ? l.weekend * 100 : null, l.cleaning * 100, l.min_nights ?? 1,
      l.weekly ?? 0, l.monthly ?? 0, l.policy,
      "• يُمنع التدخين داخل الشقة.\n• يُرجى المحافظة على الهدوء بعد الساعة 11 مساءً.\n• لا يُسمح بإقامة الحفلات.",
      "• No smoking inside the apartment.\n• Please keep noise down after 11 pm.\n• No parties or events.",
      l.featured ? 1 : 0,
    );
    const id = r.lastInsertRowid;
    ids.push(id);
    const base = l.bedrooms === 0 ? ["living", "kitchen", "bath", "view"] : scenes;
    // Vary the cover scene so cards don't all look alike.
    const coverScene = ["living", "view", "bedroom", "living", "view", "kitchen"][idx % 6];
    const order = [coverScene, ...base.filter((x) => x !== coverScene)].filter((x) => base.includes(x));
    const stmts = order.map((s, i) => insPhoto.bind(id, `/art/${s}-${(l.palette + i) % 6}.svg`, i));

    const rand = rng(idx * 97 + 13);
    const count = 2 + Math.floor(rand() * 5);
    for (let k = 0; k < count; k++) {
      const pool = REVIEW_POOL[Math.floor(rand() * REVIEW_POOL.length)];
      const name = REVIEWERS[Math.floor(rand() * REVIEWERS.length)];
      const latin = /^[A-Za-z]/.test(name);
      const rating = rand() > 0.22 ? 5 : 4;
      const daysAgo = 10 + Math.floor(rand() * 200);
      stmts.push(insReview.bind(id, name, rating, latin ? pool.en : pool.ar, latin ? "en" : "ar", `${addDays(today, -daysAgo)}T12:00:00.000Z`));
    }
    await db.batch(stmts);
  }

  // A few demo bookings so calendars and dashboards aren't empty.
  const insBooking = db.prepare(`INSERT INTO bookings (code, listing_id, guest_id, check_in, check_out, nights, guests, guest_name, guest_phone,
    status, price_json, total, cancellation_policy) VALUES (?,?,?,?,?,?,?,?,?,'confirmed',?,?,?)`);
  const insPayment = db.prepare("INSERT INTO payments (id, booking_id, provider, provider_ref, amount, status) VALUES (?,?,'demo',?,?,'paid')");
  const demoStays: [number, number, number][] = [[0, 10, 3], [3, -20, 2], [6, 4, 4], [0, 25, 5], [10, 7, 2]];
  for (const [k, [li, offset, nights]] of demoStays.entries()) {
    const l = LISTINGS[li];
    const checkIn = addDays(today, offset);
    const checkOut = addDays(checkIn, nights);
    const q = computeQuote({ base_price: l.price * 100, weekend_price: l.weekend ? l.weekend * 100 : null, cleaning_fee: l.cleaning * 100, weekly_discount: l.weekly ?? 0, monthly_discount: l.monthly ?? 0 },
      checkIn, checkOut, new Map(), { serviceFeeRate: config.serviceFeeRate, vatRate: config.vatRate });
    const b = await insBooking.run(`SU-DEMO${k + 1}`, ids[li], guestId, checkIn, checkOut, nights, 2, "ضيف تجريبي", "0500000001", JSON.stringify(q), q.total, l.policy);
    await insPayment.run(`pay_demo_${k + 1}`, b.lastInsertRowid, `demo_${k + 1}`, q.total);
  }

  // Host-blocked days & a special price on the first listing.
  const insDay = db.prepare("INSERT OR REPLACE INTO calendar_days (listing_id, date, blocked, price) VALUES (?,?,?,?)");
  const days = [];
  for (let d = 18; d < 21; d++) days.push(insDay.bind(ids[0], addDays(today, d), 1, null));
  for (let d = 30; d < 33; d++) days.push(insDay.bind(ids[0], addDays(today, d), 0, 52000));
  await db.batch(days);
}
