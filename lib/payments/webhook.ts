/** Webhook authenticity helpers (WebCrypto only, so they run on Workers and Node). Pure: no database access. */

const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Signature we embed in the callback URL we give Moyasar: HMAC-SHA256(secret, paymentId). */
export function signCallback(secret: string, paymentId: string): Promise<string> {
  return hmacHex(secret, `suitly-callback:${paymentId}`);
}

export type WebhookCheck = { ok: true } | { ok: false; reason: "not_configured" | "bad_signature" | "bad_secret_token" };

/**
 * A webhook is accepted only if (1) the URL signature matches our HMAC for this payment id, and
 * (2) when the body carries Moyasar's own `secret_token`, it equals the configured secret.
 */
export async function verifyWebhook(secret: string, paymentId: string, sig: string | null, body: unknown): Promise<WebhookCheck> {
  if (!secret) return { ok: false, reason: "not_configured" };
  if (!sig || !safeEqual(sig, await signCallback(secret, paymentId))) return { ok: false, reason: "bad_signature" };
  const token = body && typeof body === "object" ? (body as { secret_token?: unknown }).secret_token : undefined;
  if (token !== undefined && (typeof token !== "string" || !safeEqual(token, secret))) return { ok: false, reason: "bad_secret_token" };
  return { ok: true };
}
