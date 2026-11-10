import { NextResponse } from "next/server";
import { verifyMoyasarPayment } from "@/lib/payments";
import { paymentId } from "@/lib/validation";

/**
 * Asynchronous notification from Moyasar (invoice callback_url).
 * The body is ignored on purpose: we look the invoice up with our secret key and verify status/amount/currency.
 */
export async function POST(req: Request) {
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  if (!paymentId.safeParse(pid).success) return NextResponse.json({ ok: false }, { status: 400 });
  const status = await verifyMoyasarPayment(pid).catch(() => null);
  return NextResponse.json({ ok: true, status });
}
