import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQuote, isWeekendNight, refundFor } from "../lib/pricing";
import { addDays, diffDays, isIsoDate, nightsOf } from "../lib/dates";
import { bookingForm, quoteQuery } from "../lib/validation";

const L = { base_price: 42000, weekend_price: 48000, cleaning_fee: 6000, weekly_discount: 10, monthly_discount: 20 };
const rates = { serviceFeeRate: 0.05, vatRate: 0.15 };

test("dates: nights are [checkIn, checkOut)", () => {
  assert.deepEqual(nightsOf("2027-01-30", "2027-02-02"), ["2027-01-30", "2027-01-31", "2027-02-01"]);
  assert.equal(diffDays("2027-02-27", "2027-03-01"), 2);
  assert.equal(addDays("2028-02-28", 1), "2028-02-29"); // leap year
  assert.equal(isIsoDate("2027-02-30"), false);
  assert.equal(isIsoDate("2027-2-3"), false);
});

test("pricing: Thursday & Friday nights use the weekend rate", () => {
  assert.equal(isWeekendNight("2027-01-07"), true); // Thursday
  assert.equal(isWeekendNight("2027-01-08"), true); // Friday
  assert.equal(isWeekendNight("2027-01-09"), false); // Saturday
  const q = computeQuote(L, "2027-01-06", "2027-01-09", new Map(), rates); // Wed, Thu, Fri
  assert.equal(q.nightsTotal, 42000 + 48000 + 48000);
});

test("pricing: full breakdown is exact and in halalas", () => {
  // 7 nights: 5 weekday + 2 weekend = 3060 SAR, 10% weekly discount
  const q = computeQuote(L, "2027-01-03", "2027-01-10", new Map(), rates);
  assert.equal(q.nights, 7);
  assert.equal(q.nightsTotal, 306000);
  assert.equal(q.discount, 30600);
  assert.equal(q.serviceFee, Math.round((306000 - 30600 + 6000) * 0.05));
  assert.equal(q.vat, Math.round((306000 - 30600 + 6000 + q.serviceFee) * 0.15));
  assert.equal(q.total, 306000 - 30600 + 6000 + q.serviceFee + q.vat);
  assert.ok(Number.isInteger(q.total));
});

test("pricing: host special prices override everything; monthly beats weekly", () => {
  const q = computeQuote(L, "2027-01-07", "2027-01-08", new Map([["2027-01-07", 99900]]), rates);
  assert.equal(q.nightsTotal, 99900);
  const m = computeQuote(L, "2027-01-01", "2027-01-29", new Map(), rates);
  assert.equal(m.discountPercent, 20);
});

test("refunds follow the published policies", () => {
  const now = new Date("2027-01-01T12:00:00+03:00");
  assert.equal(refundFor("flexible", 10000, "2027-01-02", "15:00", now), 10000); // 27h before
  assert.equal(refundFor("flexible", 10000, "2027-01-01", "15:00", now), 0); // 3h before
  assert.equal(refundFor("moderate", 10000, "2027-01-07", "15:00", now), 10000); // > 5 days
  assert.equal(refundFor("moderate", 10000, "2027-01-03", "15:00", now), 5000); // 2 days
  assert.equal(refundFor("strict", 10000, "2027-01-09", "15:00", now), 5000); // > 7 days
  assert.equal(refundFor("strict", 10000, "2027-01-05", "15:00", now), 0);
  assert.equal(refundFor("flexible", 10000, "2026-12-30", "15:00", now), 0); // already started
});

test("validation rejects malformed input at the boundary", () => {
  assert.equal(quoteQuery.safeParse({ slug: "a-b", checkIn: "2027-01-01", checkOut: "2027-01-03", guests: "2" }).success, true);
  assert.equal(quoteQuery.safeParse({ slug: "../etc", checkIn: "2027-01-01", checkOut: "2027-01-03" }).success, false);
  assert.equal(quoteQuery.safeParse({ slug: "a", checkIn: "2027-13-01", checkOut: "2027-01-03" }).success, false);
  const base = { slug: "a", checkIn: "2027-01-01", checkOut: "2027-01-03", guests: "2", name: "Hind", phone: "055 123 4567", agree: "on" };
  const ok = bookingForm.safeParse(base);
  assert.equal(ok.success && ok.data.phone, "0551234567");
  const noTerms = bookingForm.safeParse({ ...base, agree: undefined });
  assert.equal(noTerms.success, false);
});
