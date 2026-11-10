import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDict, fmt, resolveLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPayment, type Booking } from "@/lib/data/bookings";
import { activeProvider } from "@/lib/payments";
import { demoPayAction } from "@/app/actions/booking";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { money, dateTime } from "@/lib/format";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; paymentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/pay", getDict(locale).pay.demoTitle, undefined, { noindex: true });
}

/** On-site payment simulator. Only reachable when PAYMENT_PROVIDER=demo. */
export default async function DemoGateway({ params }: Props) {
  const { locale: l, paymentId } = await params;
  const locale = resolveLocale(l);
  const t = getDict(locale);
  if (activeProvider() !== "demo") notFound();
  const user = await requireUser(locale, `/${locale}/pay/demo/${paymentId}`);
  const pay = await getPayment(paymentId);
  if (!pay || pay.provider !== "demo") notFound();
  const booking = await db().prepare("SELECT * FROM bookings WHERE id = ?").get(pay.booking_id) as Booking;
  if (booking.guest_id !== user.id) notFound();
  if (pay.status !== "initiated" || booking.status !== "pending_payment") redirect(`/${locale}/bookings/${booking.code}`);

  return (
    <div className="container">
      <div className="card card-pad demo-gateway stack">
        <span className="badge badge-sand"><Icon name="card" size={14} />DEMO</span>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{t.pay.demoTitle}</h1>
        <p className="muted" style={{ margin: 0 }}>{t.pay.demoText}</p>
        <dl className="kv">
          <div><dt>{t.pay.booking}</dt><dd dir="ltr">{booking.code}</dd></div>
          <div><dt>{t.pay.amount}</dt><dd className="num">{money(pay.amount, locale)}</dd></div>
          {booking.hold_expires_at && <div><dt><Icon name="clock" size={15} className="inline" /></dt><dd className="small">{fmt(t.pay.expiresIn, { time: dateTime(booking.hold_expires_at, locale) })}</dd></div>}
        </dl>
        <form action={demoPayAction} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="paymentId" value={pay.id} />
          <SubmitButton name="outcome" value="success" className="btn btn-lg btn-block"><Icon name="check" size={18} />{t.pay.success}</SubmitButton>
          <SubmitButton name="outcome" value="fail" className="btn btn-danger btn-block">{t.pay.fail}</SubmitButton>
        </form>
      </div>
    </div>
  );
}
