import { NextResponse } from "next/server";
import { verifyMoyasarPayment } from "@/lib/payments";
import { getPayment } from "@/lib/data/bookings";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

/** Customer is redirected here after paying. We never trust the redirect: the invoice is re-fetched server-side. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const pid = u.searchParams.get("pid") ?? "";
  const locale = u.searchParams.get("locale") === "en" ? "en" : "ar";
  const pay = await getPayment(pid);
  if (!pay) return NextResponse.redirect(`${config.siteUrl}/${locale}`);
  await verifyMoyasarPayment(pid).catch((e) => console.error("[moyasar] verify", e));
  const { code } = (await db().prepare("SELECT code FROM bookings WHERE id = ?").get<{ code: string }>(pay.booking_id))!;
  return NextResponse.redirect(`${config.siteUrl}/${locale}/bookings/${code}`);
}
