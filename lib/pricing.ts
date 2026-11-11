import { nightsOf, weekday } from "./dates";

/** All money values are integers in halalas (1 SAR = 100 halalas). */
export type PricingListing = {
  base_price: number;
  weekend_price: number | null;
  cleaning_fee: number;
  weekly_discount: number; // percent
  monthly_discount: number; // percent
};

export type NightPrice = { date: string; price: number };

export type Quote = {
  nights: number;
  nightly: NightPrice[];
  nightsTotal: number;
  avgNightly: number;
  discountPercent: number;
  discount: number;
  cleaningFee: number;
  serviceFee: number;
  serviceFeeRate: number;
  vat: number;
  vatRate: number;
  total: number;
  currency: "SAR";
};

/** Thursday & Friday nights are the Saudi weekend nights. */
export function isWeekendNight(iso: string): boolean {
  const d = weekday(iso);
  return d === 4 || d === 5;
}

export function computeQuote(
  listing: PricingListing,
  checkIn: string,
  checkOut: string,
  overrides: Map<string, number>,
  rates: { serviceFeeRate: number; vatRate: number },
): Quote {
  const dates = nightsOf(checkIn, checkOut);
  const nightly = dates.map((date) => {
    const special = overrides.get(date);
    if (special != null) return { date, price: special };
    if (listing.weekend_price && isWeekendNight(date)) return { date, price: listing.weekend_price };
    return { date, price: listing.base_price };
  });
  const nightsTotal = nightly.reduce((s, n) => s + n.price, 0);
  const n = nightly.length;
  let discountPercent = 0;
  if (n >= 28 && listing.monthly_discount > 0) discountPercent = listing.monthly_discount;
  else if (n >= 7 && listing.weekly_discount > 0) discountPercent = listing.weekly_discount;
  const discount = Math.round((nightsTotal * discountPercent) / 100);
  const cleaningFee = listing.cleaning_fee || 0;
  const taxableBeforeService = nightsTotal - discount + cleaningFee;
  const serviceFee = Math.round(taxableBeforeService * rates.serviceFeeRate);
  const vat = Math.round((taxableBeforeService + serviceFee) * rates.vatRate);
  const total = taxableBeforeService + serviceFee + vat;
  return {
    nights: n,
    nightly,
    nightsTotal,
    avgNightly: n ? Math.round(nightsTotal / n) : 0,
    discountPercent,
    discount,
    cleaningFee,
    serviceFee,
    serviceFeeRate: rates.serviceFeeRate,
    vat,
    vatRate: rates.vatRate,
    total,
    currency: "SAR",
  };
}

/** Independent re-computation of a stored quote's total (halalas) from its components. */
export function quoteTotal(q: Pick<Quote, "nightsTotal" | "discount" | "cleaningFee" | "serviceFee" | "vat">): number {
  return q.nightsTotal - q.discount + q.cleaningFee + q.serviceFee + q.vat;
}

export type CancellationPolicy = "flexible" | "moderate" | "strict";

/** Refund (halalas) for a guest cancellation, per Suitly policy. Check-in is at 15:00 Riyadh time by default. */
export function refundFor(policy: CancellationPolicy, total: number, checkIn: string, checkInTime: string, now: Date = new Date()): number {
  const [h, m] = (checkInTime || "15:00").split(":").map(Number);
  const arrival = Date.parse(`${checkIn}T${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}:00+03:00`);
  const hoursBefore = (arrival - now.getTime()) / 3_600_000;
  if (hoursBefore <= 0) return 0;
  switch (policy) {
    case "flexible":
      return hoursBefore >= 24 ? total : 0;
    case "moderate":
      if (hoursBefore >= 24 * 5) return total;
      if (hoursBefore >= 24) return Math.round(total * 0.5);
      return 0;
    case "strict":
      return hoursBefore >= 24 * 7 ? Math.round(total * 0.5) : 0;
  }
}
