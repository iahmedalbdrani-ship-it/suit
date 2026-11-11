import "server-only";
import { db } from "./db";
import { config } from "./config";
import { otpSecret, sendSms } from "./sms";
import { normalizeCode, phoneAccountEmail, PHONE_GUEST_NAME } from "./phone";
import { hashPassword } from "./password";

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_RESEND_MS = 60_000;
export const OTP_MAX_ATTEMPTS = 5;
const HOUR = 3_600_000;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function sha256(v: string) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))); }

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const randomCode = () => {
  // Rejection sampling keeps the 6 digits uniform.
  for (;;) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0];
    if (n < 4_294_000_000) return String(n % 1_000_000).padStart(6, "0");
  }
};
const randomId = () => {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Persistent sliding-window counter (survives isolate restarts, shared by all instances). */
async function hit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const row = await db().prepare("SELECT COUNT(*) AS c FROM rate_events WHERE key = ? AND at > ?").get<{ c: number }>(key, now - windowMs);
  if ((row?.c ?? 0) >= max) return false;
  await db().prepare("INSERT INTO rate_events (key, at) VALUES (?,?)").run(key, now);
  return true;
}
async function cleanup() {
  if (Math.random() < 0.05) {
    await db().prepare("DELETE FROM rate_events WHERE at < ?").run(Date.now() - 2 * HOUR);
    await db().prepare("DELETE FROM phone_otps WHERE created_at < ?").run(new Date(Date.now() - 24 * HOUR).toISOString());
  }
}

export type SendResult =
  | { ok: true; challengeId: string; resendAt: number }
  | { ok: false; error: "sms_unavailable" | "sms_failed" | "otp_rate_limited" | "otp_cooldown"; retryAfter?: number };

const smsText = (code: string) =>
  `رمز التحقق في Suitly: ${code}\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.\n@suitly.online #${code}`;

/** Create (or, when `challengeId` is given, re-issue) a code for `phone` and send it. */
export async function issueOtp(phone: string, ip: string, challengeId?: string): Promise<SendResult> {
  const secret = otpSecret();
  if (!secret) return { ok: false, error: "sms_unavailable" };
  await cleanup();
  const phoneKey = (await sha256(phone)).slice(0, 24);
  const ipKey = (await sha256(ip)).slice(0, 24);
  const now = Date.now();

  let id = challengeId;
  if (id) {
    const row = await db().prepare("SELECT resend_at, phone_e164 FROM phone_otps WHERE id = ?").get<{ resend_at: string; phone_e164: string }>(await sha256(id));
    if (row && row.phone_e164 === phone) {
      const wait = Date.parse(row.resend_at) - now;
      if (wait > 0) return { ok: false, error: "otp_cooldown", retryAfter: Math.ceil(wait / 1000) };
    }
  }
  if (!(await hit(`otp_send:phone:${phoneKey}`, 5, HOUR))) return { ok: false, error: "otp_rate_limited" };
  if (!(await hit(`otp_send:ip:${ipKey}`, 10, HOUR))) return { ok: false, error: "otp_rate_limited" };
  if (!(await hit("otp_send:all", config.otpGlobalHourlyLimit, HOUR))) return { ok: false, error: "otp_rate_limited" };

  const code = randomCode();
  const codeHash = await hmac(secret, `${phone}:${code}`);
  const expires = new Date(now + OTP_TTL_MS).toISOString();
  const resendAt = now + OTP_RESEND_MS;
  const rowId = id ? await sha256(id) : "";
  let reused = false;
  if (id) {
    const r = await db().prepare(
      "UPDATE phone_otps SET code_hash = ?, expires_at = ?, attempts = 0, resend_at = ?, sends = sends + 1, consumed_at = NULL WHERE id = ? AND phone_e164 = ?",
    ).run(codeHash, expires, new Date(resendAt).toISOString(), rowId, phone);
    reused = r.changes === 1;
  }
  if (!reused) {
    id = randomId();
    await db().prepare("INSERT INTO phone_otps (id, phone_e164, code_hash, expires_at, resend_at) VALUES (?,?,?,?,?)")
      .run(await sha256(id), phone, codeHash, expires, new Date(resendAt).toISOString());
  }
  const sent = await sendSms(phone, smsText(code));
  if (!sent.ok) {
    await db().prepare("DELETE FROM phone_otps WHERE id = ?").run(await sha256(id!));
    return { ok: false, error: sent.reason === "unavailable" ? "sms_unavailable" : "sms_failed" };
  }
  return { ok: true, challengeId: id!, resendAt };
}

export type Challenge = { phone: string; resendAt: number; expiresAt: number };
export async function getChallenge(challengeId: string | undefined): Promise<Challenge | null> {
  if (!challengeId) return null;
  const row = await db().prepare("SELECT phone_e164, resend_at, expires_at, consumed_at FROM phone_otps WHERE id = ?")
    .get<{ phone_e164: string; resend_at: string; expires_at: string; consumed_at: string | null }>(await sha256(challengeId));
  if (!row || row.consumed_at) return null;
  return { phone: row.phone_e164, resendAt: Date.parse(row.resend_at), expiresAt: Date.parse(row.expires_at) };
}

export type VerifyResult = { ok: true; userId: number; created: boolean } | { ok: false; error: "otp_invalid" | "otp_rate_limited" };

/** Every failure looks the same to the caller: wrong, expired, used and "no such challenge" are indistinguishable. */
export async function verifyOtp(challengeId: string | undefined, rawCode: string, ip: string): Promise<VerifyResult> {
  const secret = otpSecret();
  const code = normalizeCode(rawCode);
  if (!challengeId || !secret || !/^\d{6}$/.test(code)) return { ok: false, error: "otp_invalid" };
  if (!(await hit(`otp_verify:ip:${(await sha256(ip)).slice(0, 24)}`, 30, HOUR))) return { ok: false, error: "otp_rate_limited" };

  const id = await sha256(challengeId);
  // Count the attempt first, atomically, so parallel guesses cannot exceed the limit.
  const upd = await db().prepare(
    "UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ?",
  ).run(id, new Date().toISOString(), OTP_MAX_ATTEMPTS);
  if (upd.changes !== 1) return { ok: false, error: "otp_invalid" };
  const row = await db().prepare("SELECT phone_e164, code_hash FROM phone_otps WHERE id = ?").get<{ phone_e164: string; code_hash: string }>(id);
  if (!row || !safeEqual(row.code_hash, await hmac(secret, `${row.phone_e164}:${code}`))) return { ok: false, error: "otp_invalid" };

  // Single use: only one request can flip consumed_at.
  const used = await db().prepare("UPDATE phone_otps SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL").run(new Date().toISOString(), id);
  if (used.changes !== 1) return { ok: false, error: "otp_invalid" };

  const phone = row.phone_e164;
  const existing = await db().prepare("SELECT id FROM users WHERE phone_e164 = ?").get<{ id: number }>(phone);
  if (existing) return { ok: true, userId: existing.id, created: false };
  try {
    const r = await db().prepare("INSERT INTO users (name, email, phone, phone_e164, password_hash, role) VALUES (?,?,?,?,?,'guest')")
      .run(PHONE_GUEST_NAME, phoneAccountEmail(phone), phone, phone, await hashPassword(randomId() + randomId()));
    return { ok: true, userId: r.lastInsertRowid, created: true };
  } catch {
    // Lost a race with a parallel verification of the same number.
    const again = await db().prepare("SELECT id FROM users WHERE phone_e164 = ?").get<{ id: number }>(phone);
    return again ? { ok: true, userId: again.id, created: false } : { ok: false, error: "otp_invalid" };
  }
}

export async function discardChallenge(challengeId: string | undefined) {
  if (challengeId) await db().prepare("DELETE FROM phone_otps WHERE id = ?").run(await sha256(challengeId));
}

/** Cloudflare Turnstile, enforced only when both keys are configured. */
export async function captchaOk(token: string, ip: string): Promise<boolean> {
  if (!config.turnstileSecret || !config.turnstileSiteKey) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(6000),
    });
    const j = (await res.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}
