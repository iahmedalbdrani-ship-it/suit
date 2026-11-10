import "server-only";
import { config } from "../config";
import type { Locale } from "../i18n/config";
import {
  createPaymentRecord, getPayment, markPaymentFailed, markPaymentPaid, updatePayment,
  type Booking, type BookingStatus, type Payment,
} from "../data/bookings";

/**
 * Payment integration point.
 * - "demo": an on-site simulator, clearly labelled, never charges money.
 * - "moyasar": hosted invoice checkout. The secret key stays on the server; every result is
 *   re-fetched from Moyasar's API and checked (status, amount, currency) before a booking is confirmed.
 */

export type StartResult = { ok: true; url: string; payment: Payment } | { ok: false; reason: "unavailable" };

const MOYASAR_API = "https://api.moyasar.com/v1";

function moyasarAuth() {
  return `Basic ${btoa(`${config.moyasarSecretKey}:`)}`;
}

export function activeProvider(): "demo" | "moyasar" {
  if (config.paymentProvider === "moyasar" && config.moyasarSecretKey) return "moyasar";
  return "demo";
}

export async function startPayment(booking: Booking, locale: Locale): Promise<StartResult> {
  const provider = activeProvider();
  if (config.paymentProvider === "moyasar" && provider !== "moyasar") return { ok: false, reason: "unavailable" };
  const payment = await createPaymentRecord(booking.id, provider, booking.total);

  if (provider === "demo") {
    const url = `/${locale}/pay/demo/${payment.id}`;
    await updatePayment(payment.id, { checkout_url: url, provider_ref: `demo_${payment.id}` });
    return { ok: true, url, payment };
  }

  try {
    const res = await fetch(`${MOYASAR_API}/invoices`, {
      method: "POST",
      headers: { Authorization: moyasarAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: booking.total,
        currency: "SAR",
        description: `Suitly booking ${booking.code}`,
        callback_url: `${config.siteUrl}/api/payments/moyasar/webhook?pid=${payment.id}`,
        success_url: `${config.siteUrl}/api/payments/moyasar/return?pid=${payment.id}&locale=${locale}`,
        back_url: `${config.siteUrl}/${locale}/bookings/${booking.code}`,
        expired_at: booking.hold_expires_at ?? undefined,
        metadata: { booking_code: booking.code, payment_id: payment.id },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Moyasar invoice ${res.status}`);
    const invoice = (await res.json()) as { id: string; url: string };
    await updatePayment(payment.id, { provider_ref: invoice.id, checkout_url: invoice.url });
    return { ok: true, url: invoice.url, payment };
  } catch (err) {
    console.error("[payments] start failed", err);
    await markPaymentFailed(payment.id, "failed", { error: String(err) });
    return { ok: false, reason: "unavailable" };
  }
}

type MoyasarInvoice = { id: string; status: string; amount: number; currency: string; payments?: { id: string; status: string }[] };

/** Re-fetch the invoice from Moyasar and apply the verified result. Safe to call many times. */
export async function verifyMoyasarPayment(paymentId: string): Promise<BookingStatus | "pending" | null> {
  const pay = await getPayment(paymentId);
  if (!pay || pay.provider !== "moyasar" || !pay.provider_ref) return null;
  if (pay.status === "paid") return "confirmed";
  const res = await fetch(`${MOYASAR_API}/invoices/${encodeURIComponent(pay.provider_ref)}`, {
    headers: { Authorization: moyasarAuth() },
    cache: "no-store",
  });
  if (!res.ok) return "pending";
  const inv = (await res.json()) as MoyasarInvoice;
  if (inv.status === "paid" && inv.amount === pay.amount && inv.currency === "SAR") {
    const paid = inv.payments?.find((p) => p.status === "paid");
    return markPaymentPaid(pay.id, paid?.id ?? null, inv);
  }
  if (inv.status === "expired" || inv.status === "canceled") {
    await markPaymentFailed(pay.id, "expired", inv);
    return "payment_failed";
  }
  return "pending";
}

/** Demo simulator — refuses to run unless the active provider is "demo". */
export async function completeDemoPayment(paymentId: string, outcome: "success" | "fail"): Promise<BookingStatus | null> {
  const pay = await getPayment(paymentId);
  if (!pay || pay.provider !== "demo" || activeProvider() !== "demo") return null;
  if (outcome === "success") return markPaymentPaid(pay.id, `demo_${pay.id}`, { simulated: true });
  await markPaymentFailed(pay.id, "failed", { simulated: true });
  return "payment_failed";
}

/** Issue a refund through the provider. Demo refunds are recorded only. */
export async function refundPayment(paymentId: string, amount: number): Promise<boolean> {
  const pay = await getPayment(paymentId);
  if (!pay || amount <= 0) return false;
  if (pay.provider === "demo") {
    await updatePayment(pay.id, { status: "refunded" });
    return true;
  }
  if (pay.provider === "moyasar" && pay.provider_payment_id && config.moyasarSecretKey) {
    try {
      const res = await fetch(`${MOYASAR_API}/payments/${encodeURIComponent(pay.provider_payment_id)}/refund`, {
        method: "POST",
        headers: { Authorization: moyasarAuth(), "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        cache: "no-store",
      });
      if (res.ok) {
        await updatePayment(pay.id, { status: "refunded" });
        return true;
      }
    } catch (err) {
      console.error("[payments] refund failed", err);
    }
  }
  return false; // stays "refund_pending" for the admin to follow up
}
