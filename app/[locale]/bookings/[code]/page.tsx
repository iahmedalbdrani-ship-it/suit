import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDict, fmt, resolveLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { expireStaleHolds, getBookingDetail, latestPayment, quoteOf } from "@/lib/data/bookings";
import { verifyMoyasarPayment } from "@/lib/payments";
import { retryPaymentAction, submitReviewAction } from "@/app/actions/booking";
import { db } from "@/lib/db";
import { Alert, PriceBreakdown, StatusBadge, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { dateRange, dateTime, money } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { todayInRiyadh } from "@/lib/dates";

type Props = { params: Promise<{ locale: string; code: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: l, code } = await params;
  const locale = resolveLocale(l);
  return pageMeta(locale, `/bookings/${code}`, `${getDict(locale).booking.code} ${code}`, undefined, { noindex: true });
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { locale: l, code } = await params;
  const locale = resolveLocale(l);
  const sp = await searchParams;
  const t = getDict(locale);
  const user = await requireUser(locale, `/${locale}/bookings/${code}`);
  await expireStaleHolds();
  let b = await getBookingDetail(code);
  if (!b) notFound();
  if (b.guest_id !== user.id && b.host_id !== user.id && user.role !== "admin") notFound();

  // A returning customer may arrive before Moyasar's webhook: verify once more on the server.
  let pay = await latestPayment(b.id);
  if (b.status === "pending_payment" && pay?.provider === "moyasar" && pay.status === "initiated") {
    await verifyMoyasarPayment(pay.id).catch(() => null);
    b = (await getBookingDetail(code))!;
    pay = await latestPayment(b.id);
  }

  const review = await db().prepare("SELECT rating, comment FROM reviews WHERE booking_id = ?").get<{ rating: number; comment: string }>(b.id);
  const canReview = b.guest_id === user.id && b.status === "confirmed" && b.check_out <= todayInRiyadh();
  const q = quoteOf(b);
  const title = locale === "ar" ? b.title_ar : b.title_en;
  const place = `${locale === "ar" ? b.district_ar : b.district_en}${locale === "ar" ? "، " : ", "}${locale === "ar" ? b.city_ar : b.city_en}`;
  const isGuest = b.guest_id === user.id;
  const canRetry = isGuest && ["payment_failed", "expired", "pending_payment"].includes(b.status) && b.check_in >= todayInRiyadh();

  const hero = {
    confirmed: { cls: "status-ok", icon: "check", h: t.booking.confirmedTitle, p: t.booking.confirmedText },
    pending_payment: { cls: "status-warn", icon: "clock", h: t.booking.pendingTitle, p: t.booking.pendingText },
    payment_failed: { cls: "status-bad", icon: "x", h: t.booking.failedTitle, p: t.booking.failedText },
    expired: { cls: "status-warn", icon: "clock", h: t.booking.expiredTitle, p: t.errors.hold_expired },
    cancelled: { cls: "status-warn", icon: "x", h: t.booking.cancelledTitle, p: "" },
    payment_conflict: { cls: "status-bad", icon: "alert", h: t.booking.conflictTitle, p: t.booking.conflictText },
  }[b.status];

  return (
    <div className="narrow" style={{ paddingBlock: "2rem 3rem" }}>
      {b.status === "confirmed" && (
        <ol className="stepper" aria-label={t.checkout.title}>
          <li className="done">{t.checkout.step1}</li>
          <li className="done">{t.checkout.step2}</li>
          <li aria-current="step">{t.checkout.step3}</li>
        </ol>
      )}
      {sp.error && <div style={{ marginBottom: "1rem" }}><Alert kind="error">{errorText(t, sp.error)}</Alert></div>}

      <section className={`status-hero ${hero.cls}`}>
        <div className="ico"><Icon name={hero.icon} size={34} /></div>
        <h1 style={{ fontSize: "1.7rem" }}>{hero.h}</h1>
        {hero.p && <p className="muted">{hero.p}</p>}
        <span className="code-pill">{b.code}</span>
        {b.status === "confirmed" && pay?.provider === "demo" && <p className="small" style={{ marginTop: "1rem", color: "var(--sand-700)" }}>{t.booking.demoConfirmed}</p>}
        {b.status === "pending_payment" && b.hold_expires_at && <p className="small muted" style={{ marginTop: "0.75rem" }}>{fmt(t.pay.expiresIn, { time: dateTime(b.hold_expires_at, locale) })}</p>}
        {canRetry && (
          <form action={retryPaymentAction} style={{ marginTop: "1.25rem" }}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="code" value={b.code} />
            <SubmitButton className="btn btn-lg">{b.status === "pending_payment" ? t.booking.payNow : t.booking.tryAgain}</SubmitButton>
          </form>
        )}
      </section>

      <div className="card card-pad stack" style={{ marginTop: "1.5rem" }}>
        <div className="stay-summary">
          {b.cover && <img src={b.cover} alt="" width={120} height={90} />}
          <div>
            <Link href={`/${locale}/apartments/${b.slug}`} style={{ fontFamily: "var(--font-head)", fontWeight: 600, color: "var(--green)" }}>{title}</Link>
            <div className="muted small">{place}</div>
            <StatusBadge status={b.status} t={t} />
          </div>
        </div>
        <dl className="kv">
          <div><dt>{t.checkout.dates}</dt><dd>{dateRange(b.check_in, b.check_out, locale)}</dd></div>
          <div><dt>{t.listing.checkInTime.replace(" {time}", "").replace("{time}", "")}</dt><dd className="num">{b.check_in_time}</dd></div>
          <div><dt>{t.listing.checkOutTime.replace(" {time}", "").replace("{time}", "")}</dt><dd className="num">{b.check_out_time}</dd></div>
          <div><dt>{t.checkout.guests}</dt><dd>{b.guests}</dd></div>
          <div><dt>{t.checkout.name}</dt><dd>{b.guest_name}</dd></div>
          <div><dt>{t.booking.address}</dt><dd>{b.status === "confirmed" ? b.address : <span className="muted">{t.booking.addressHidden}</span>}</dd></div>
          <div><dt>{t.listing.host}</dt><dd>{b.host_name}</dd></div>
          {pay && <div><dt>{t.booking.paidWith}</dt><dd>{pay.provider === "demo" ? "Demo" : "Moyasar"} · <StatusBadge status={pay.status} t={t} /></dd></div>}
          {b.status === "cancelled" && b.refund_amount != null && (
            <div><dt>{t.booking.refund}</dt><dd className="num">{money(b.refund_amount, locale)}</dd></div>
          )}
        </dl>
        <h2 style={{ fontSize: "1.1rem", margin: "0.5rem 0 0" }}>{t.checkout.priceTitle}</h2>
        <PriceBreakdown q={q} locale={locale} t={t} />
        <p className="muted small" style={{ margin: 0 }}>{t.listing.cancellation}: {t.policies[b.cancellation_policy]} — {t.policies[`${b.cancellation_policy}Text` as "flexibleText"]}</p>
      </div>

      {sp.ok === "review_saved" && <div style={{ marginTop: "1.5rem" }}><Alert kind="ok">{t.booking.reviewSaved}</Alert></div>}
      {canReview && (
        <section id="review" className="card card-pad stack no-print" style={{ marginTop: "1.5rem" }} aria-labelledby="review-h">
          <h2 id="review-h" style={{ fontSize: "1.1rem", margin: 0 }}>{review ? t.booking.reviewYours : t.booking.reviewTitle}</h2>
          {review ? (
            <>
              <p className="rating" style={{ margin: 0 }}><Icon name="star" size={16} filled /><span className="num">{fmt(t.booking.reviewStars, { n: review.rating })}</span></p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{review.comment}</p>
            </>
          ) : (
            <form action={submitReviewAction} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="code" value={b.code} />
              <p className="muted small" style={{ margin: 0 }}>{t.booking.reviewText}</p>
              <fieldset className="filter-group" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="label">{t.booking.reviewRating}</legend>
                <div className="chips">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <label className="chip-input" key={n}>
                      <input type="radio" name="rating" value={n} required />
                      <span><Icon name="star" size={13} filled />{fmt(t.booking.reviewStars, { n })}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field"><span>{t.booking.reviewComment}</span><textarea className="textarea" name="comment" rows={4} minLength={5} maxLength={1000} required /></label>
              <div><SubmitButton className="btn">{t.booking.reviewSubmit}</SubmitButton></div>
            </form>
          )}
        </section>
      )}

      <div className="row no-print" style={{ marginTop: "1.5rem", justifyContent: "center" }}>
        <Link href={`/${locale}/account`} className="btn btn-outline">{t.booking.myBookings}</Link>
        <Link href={`/${locale}/apartments/${b.slug}`} className="btn btn-ghost">{t.booking.viewListing}</Link>
      </div>
    </div>
  );
}
