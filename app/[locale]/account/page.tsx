import { Fragment } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getDict, fmt, resolveLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookingsForGuest, guestRefundPreview, isUpcoming, type BookingWithListing } from "@/lib/data/bookings";
import { guestCancelAction } from "@/app/actions/booking";
import { profileAction, reviewAction } from "@/app/actions/account";
import { Alert, EmptyState, StatusBadge, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { dateRange, money } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { todayInRiyadh } from "@/lib/dates";
import { isPhoneAccountEmail, PHONE_GUEST_NAME } from "@/lib/phone";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/account", getDict(locale).account.title, undefined, { noindex: true });
}

export default async function AccountPage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const user = await requireUser(locale, `/${locale}/account`);
  const tab = ["upcoming", "past", "cancelled", "profile"].includes(sp.tab ?? "") ? sp.tab! : "upcoming";
  const all = await bookingsForGuest(user.id);
  const today = todayInRiyadh();
  const groups: Record<string, BookingWithListing[]> = {
    upcoming: all.filter((b) => isUpcoming(b)).reverse(),
    past: all.filter((b) => b.status === "confirmed" && b.check_out <= today),
    cancelled: all.filter((b) => ["cancelled", "expired", "payment_failed"].includes(b.status)),
  };
  const reviewed = new Set((await db().prepare("SELECT booking_id FROM reviews WHERE booking_id IS NOT NULL").all() as { booking_id: number }[]).map((r) => r.booking_id));
  const okMsg = { cancelled: t.account.cancelledOk, saved: t.account.saved, reviewed: t.account.reviewed }[sp.ok ?? ""];
  const tabs = [["upcoming", t.account.upcoming], ["past", t.account.past], ["cancelled", t.account.cancelled], ["profile", t.account.profile]] as const;

  return (
    <div className="container" style={{ paddingBottom: "3rem" }}>
      <div className="dash-head">
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{user.name === PHONE_GUEST_NAME ? t.account.helloGeneric : fmt(t.account.hello, { name: user.name.split(" ")[0] })}</h1>
        <p className="muted" style={{ margin: 0 }} dir="ltr">{isPhoneAccountEmail(user.email) ? user.phone : user.email}</p>
      </div>
      <nav className="tabs" aria-label={t.account.title}>
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/${locale}/account?tab=${k}`} aria-current={tab === k ? "page" : undefined}>
            {label}{k !== "profile" && groups[k].length ? ` (${groups[k].length})` : ""}
          </Link>
        ))}
      </nav>
      {okMsg && <div style={{ marginBottom: "1rem" }}><Alert kind="ok">{okMsg}</Alert></div>}
      {sp.error && <div style={{ marginBottom: "1rem" }}><Alert kind="error">{errorText(t, sp.error)}</Alert></div>}

      {tab === "profile" ? (
        <form action={profileAction} className="card card-pad stack" style={{ maxWidth: 520 }}>
          <input type="hidden" name="locale" value={locale} />
          <label className="field"><span>{t.auth.name}</span><input className="input" name="name" required defaultValue={user.name} maxLength={80} /></label>
          <label className="field"><span>{t.auth.email}</span><input className="input" value={isPhoneAccountEmail(user.email) ? (user.phone ?? "") : user.email} disabled dir="ltr" /></label>
          <label className="field"><span>{t.checkout.phone}</span><input className="input" name="phone" type="tel" dir="ltr" defaultValue={user.phone ?? ""} /></label>
          <div><SubmitButton>{t.account.save}</SubmitButton></div>
        </form>
      ) : groups[tab].length === 0 ? (
        <EmptyState icon="calendar" title={t.account.empty} action={<Link href={`/${locale}/search`} className="btn">{t.account.explore}</Link>} />
      ) : (
        <div className="stack">
          {groups[tab].map((b) => {
            const title = locale === "ar" ? b.title_ar : b.title_en;
            const refund = b.status === "confirmed" && b.check_in > today ? guestRefundPreview(b) : null;
            return (
              <article key={b.id} className="card booking-row">
                {b.cover ? <img src={b.cover} alt="" width={140} height={105} loading="lazy" /> : <span />}
                <div>
                  <div className="row"><StatusBadge status={b.status} t={t} /><span className="muted xs" dir="ltr">{b.code}</span></div>
                  <h2 style={{ fontSize: "1.05rem", margin: "0.35rem 0 0.15rem" }}>{title}</h2>
                  <div className="muted small">{dateRange(b.check_in, b.check_out, locale)} · {fmt(t.listing.guests, { n: b.guests })}</div>
                  <div className="small" style={{ marginTop: "0.25rem" }}><strong className="num">{money(b.total, locale)}</strong></div>
                  {b.status === "cancelled" && b.refund_amount != null && <div className="small muted">{t.booking.refund}: <span className="num">{money(b.refund_amount, locale)}</span></div>}
                  {tab === "past" && !reviewed.has(b.id) && (
                    <details className="inline-form" style={{ marginTop: "0.75rem" }}>
                      <summary className="btn btn-sand btn-sm">{t.account.review}</summary>
                      <form action={reviewAction} className="stack">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="code" value={b.code} />
                        <fieldset>
                          <legend className="label">{t.account.rating}</legend>
                          <div className="stars-input">
                            {[5, 4, 3, 2, 1].map((n) => (
                              <Fragment key={n}>
                                <input type="radio" id={`r-${b.id}-${n}`} name="rating" value={n} required />
                                <label htmlFor={`r-${b.id}-${n}`} aria-label={`${n}/5`}>★</label>
                              </Fragment>
                            ))}
                          </div>
                        </fieldset>
                        <label className="field"><span>{t.account.comment}</span><textarea className="textarea" name="comment" required minLength={3} maxLength={1000} /></label>
                        <div><SubmitButton className="btn btn-sm">{t.account.sendReview}</SubmitButton></div>
                      </form>
                    </details>
                  )}
                </div>
                <div className="stack" style={{ alignSelf: "center" }}>
                  <Link href={`/${locale}/bookings/${b.code}`} className="btn btn-outline btn-sm">{t.account.details}</Link>
                  {(refund != null || b.status === "pending_payment") && (
                    <details className="inline-form">
                      <summary className="btn btn-danger btn-sm">{t.account.cancel}</summary>
                      <form action={guestCancelAction} className="stack" style={{ maxWidth: 260 }}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="code" value={b.code} />
                        {refund != null && <p className="small" style={{ margin: 0 }}>{fmt(t.account.cancelRefund, { amount: money(refund, locale) })}</p>}
                        <SubmitButton className="btn btn-danger btn-sm">{t.account.cancelConfirm}</SubmitButton>
                      </form>
                    </details>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
