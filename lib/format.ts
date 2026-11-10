import { intlTag, type Locale } from "./i18n/config";

/** Halalas → "1,250 ر.س" / "SAR 1,250". Whole riyals unless there are halalas. */
export function money(halalas: number, locale: Locale): string {
  const sar = halalas / 100;
  const decimals = Number.isInteger(sar) ? 0 : 2;
  return new Intl.NumberFormat(intlTag(locale), { style: "currency", currency: "SAR", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(sar);
}

export function sar(halalas: number): string {
  return String(Math.round(halalas) / 100);
}

/** "YYYY-MM-DD" → localized date (Gregorian). */
export function date(iso: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return new Intl.DateTimeFormat(intlTag(locale), { timeZone: "Asia/Riyadh", ...opts }).format(d);
}

export function dateRange(a: string, b: string, locale: Locale): string {
  return `${date(a, locale, { day: "numeric", month: "short" })} – ${date(b, locale, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function dateTime(iso: string, locale: Locale): string {
  return date(iso, locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function rating(n: number | null | undefined): string {
  return n == null ? "" : (Math.round(n * 100) / 100).toFixed(2).replace(/0$/, "");
}
