import { NextResponse } from "next/server";
import { activeProvider, verifyMoyasarPayment } from "@/lib/payments";
import { verifyWebhook } from "@/lib/payments/webhook";
import { hasPaymentEvent, recordPaymentEvent } from "@/lib/data/bookings";
import { config } from "@/lib/config";
import { paymentId } from "@/lib/validation";

/**
 * Asynchronous notification from Moyasar (invoice callback_url).
 * 1. Authenticity: the URL must carry our HMAC signature for this payment id (and Moyasar's `secret_token`, if sent, must match).
 * 2. Idempotency: an event id is processed once; repeated deliveries are acknowledged and ignored.
 * 3. The body is otherwise ignored: the invoice is re-fetched with our secret key and status/amount/currency are verified.
 */
export async function POST(req: Request) {
  if (activeProvider() !== "moyasar") return NextResponse.json({ ok: false }, { status: 404 });
  const url = new URL(req.url);
  const pid = url.searchParams.get("pid") ?? "";
  if (!paymentId.safeParse(pid).success) return NextResponse.json({ ok: false }, { status: 400 });

  const body = await req.json().catch(() => null);
  const check = await verifyWebhook(config.moyasarWebhookSecret, pid, url.searchParams.get("sig"), body);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.reason }, { status: check.reason === "not_configured" ? 503 : 401 });

  const rawId = body && typeof body === "object" ? (body as { id?: unknown }).id : undefined;
  const status = body && typeof body === "object" ? String((body as { status?: unknown }).status ?? "") : "";
  const eventId = `${pid}:${typeof rawId === "string" ? rawId : "evt"}:${status}`;
  if (await hasPaymentEvent(eventId)) return NextResponse.json({ ok: true, duplicate: true });

  const result = await verifyMoyasarPayment(pid).catch((e) => { console.error("[moyasar] verify", e); return null; });
  if (result !== null && result !== "pending") await recordPaymentEvent(eventId, pid);
  return NextResponse.json({ ok: true, status: result });
}
