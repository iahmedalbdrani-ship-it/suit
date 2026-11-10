import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import type { Locale } from "./i18n/config";

export const SESSION_COOKIE = "suitly_session";
const SESSION_DAYS = 30;

export type Role = "guest" | "host" | "admin";
export type User = { id: number; name: string; email: string; phone: string | null; role: Role; created_at: string };

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (v: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export async function createSession(userId: number) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)").run(await sha256(token), userId, expires.toISOString());
  await db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(await sha256(token));
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await db()
    .prepare(`SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
              WHERE s.token_hash = ? AND s.expires_at > ?`)
    .get<User>(await sha256(token), new Date().toISOString());
  return row ?? null;
});

export async function requireUser(locale: Locale, next: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireRole(locale: Locale, roles: Role[], next: string): Promise<User> {
  const user = await requireUser(locale, next);
  if (!roles.includes(user.role)) redirect(`/${locale}?error=forbidden`);
  return user;
}

/** Very small in-memory limiter (per process). Use a shared store (e.g. Redis) when running several instances. */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max = 8, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n += 1;
  return h.n <= max;
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: unknown, fallback: string): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
