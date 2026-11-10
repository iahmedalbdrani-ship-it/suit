import "server-only";
import { headers } from "next/headers";
import { resolveLocale, type Locale } from "@/lib/i18n";

export function s(fd: FormData, key: string, max = 2000): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function n(fd: FormData, key: string, fallback = 0): number {
  const v = Number(s(fd, key, 32));
  return Number.isFinite(v) ? v : fallback;
}

/** Money input in SAR (allows decimals) → halalas, or null if empty/invalid. */
export function moneyField(fd: FormData, key: string): number | null {
  const raw = s(fd, key, 32).replace(/[,\s]/g, "");
  if (!raw) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0 || v > 1_000_000) return null;
  return Math.round(v * 100);
}

export function loc(fd: FormData): Locale {
  return resolveLocale(s(fd, "locale", 4));
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") || (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") u.set(k, String(v));
  const str = u.toString();
  return str ? `?${str}` : "";
}
