import ar, { type Dict } from "./ar";
import en from "./en";
import { type Locale, isLocale, defaultLocale } from "./config";

export * from "./config";
export type { Dict };

const dicts: Record<Locale, Dict> = { ar, en };

export function getDict(locale: Locale): Dict {
  return dicts[locale] ?? dicts[defaultLocale];
}

/** Resolve a route param into a supported locale (falls back to Arabic). */
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** Pick the right bilingual column. */
export function pick<T extends Record<string, unknown>>(row: T, base: string, locale: Locale): string {
  const v = row[`${base}_${locale}`] ?? row[`${base}_ar`] ?? "";
  return String(v ?? "");
}
