import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Alert, PriceBreakdown, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { fmt, getDict, resolveLocale } from "@/lib/i18n";
import { getCity, getCover, getListingBySlug, quoteStay } from "@/lib/data/listings";
import { getCurrentUser } from "@/lib/auth";
import { createBookingAction } from "@/app/actions/booking";
import { dateRange } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { config } from "@/lib/config";
import { smsConfigured } from "@/lib/sms";
import { PHONE_GUEST_NAME } from "@/lib/phone";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: l, slug } = await params;
  const locale = resolveLocale(l);
  return pageMeta(locale, `/book/${slug}`, getDict(locale).checkout.title, undefined, { noindex: true });
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale: l, slug } = await params;
  const locale = resolveLocale(l);
  const sp = await searchParams;
  const t = getDict(locale);
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();
  const checkIn = sp.checkIn ?? "";
  const checkOut = sp.checkOut ?? "";
  const guests = Math.trunc(Number(sp.guests ?? "1")) || 1;
  const user = await getCurrentUser();
  const result = await quoteStay(listing, checkIn, checkOut, guests);
  const title = locale === "ar" ? listing.title_ar : listing.title_en;
  const city = (await getCity(listing.city_slug))!;
  const cover = await getCover(listing.id);
  const self = `/${locale}/book/${slug}?${new URLSearchParams({ checkIn, checkOut, guests: String(guests) })}`;
  const backToListing = `/${locale}/apartments/${slug}?${new URLSearchParams({ checkIn, checkOut, guests: String(guests) })}`;
  const policyName = t.policies[listing.cancellation_policy];
  const policyText = t.policies[`${listing.cancellation_policy}Text` as "flexibleText"];
  const quoteErr = !result.ok ? errorText(t, result.error.code, "n" in result.error ? result.error.n : undefined) : null;
  const formErr = sp.error && sp.error !== (result.ok ? "" : result.error.code) ? errorText(t, sp.error, sp.n) : null;

  return (
    <div className="container" style={{ paddingBlock: "2rem 3rem" }}>
      <ol className="stepper" aria-label={t.checkout.title}>
        <li aria-current="step">{t.checkout.step1}</li>
        <li>{t.checkout.step2}</li>
        <li>{t.checkout.step3}</li>
      </ol>
      <h1 style={{ fontSize: "1.8rem" }}>{t.checkout.title}</h1>

      <div className="checkout-layout">
        <div className="stack">
          {formErr && <Alert kind="error">{formErr}</Alert>}
          {quoteErr && (
            <Alert kind="error">
              {quoteErr} <Link href={backToListing}>{t.checkout.edit}</Link>
            </Alert>
          )}

          {!user ? (
            <div className="card card-pad">
              <h2 style={{ fontSize: "1.2rem" }}>{t.checkout.loginTitle}</h2>
              <p className="muted">{t.checkout.loginText}</p>
              <div className="row">
                {smsConfigured() && <Link className="btn" href={`/${locale}/phone?next=${encodeURIComponent(self)}`}>{t.phone.useMobile}</Link>}
                <Link className={smsConfigured() ? "btn btn-outline" : "btn"} href={`/${locale}/login?next=${encodeURIComponent(self)}`}>{t.nav.login}</Link>
                <Link className="btn btn-outline" href={`/${locale}/register?next=${encodeURIComponent(self)}`}>{t.nav.register}</Link>
              </div>
            </div>
          ) : result.ok ? (
            <form action={createBookingAction} className="card card-pad stack">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="checkIn" value={checkIn} />
              <input type="hidden" name="checkOut" value={checkOut} />
              <input type="hidden" name="guests" value={guests} />
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{t.checkout.guestInfo}</h2>
              <div className="grid-2">
                <label className="field"><span>{t.checkout.name}</span>
                  <input className="input" name="name" required maxLength={80} autoComplete="name" defaultValue={user.name === PHONE_GUEST_NAME ? "" : user.name} />
                </label>
                <label className="field"><span>{t.checkout.phone}</span>
                  <input className="input" name="phone" required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" pattern="[+0-9 ]{9,16}" placeholder={t.checkout.phoneHint} defaultValue={user.phone ?? ""} />
                </label>
              </div>
              <label className="field"><span>{t.checkout.notes}</span>
                <textarea className="textarea" name="notes" maxLength={500} rows={3} />
              </label>
              <div className="alert alert-info">
                <Icon name="info" size={18} />
                <div><strong>{t.listing.cancellation}: {policyName}</strong><br />{policyText}</div>
              </div>
              <label className="check">
                <input type="checkbox" name="agree" required />
                <span>{t.checkout.agree} <Link href={`/${locale}/terms`} target="_blank">{t.footer.terms}</Link></span>
              </label>
              <SubmitButton className="btn btn-lg btn-block" pending={t.checkout.paying}>
                <Icon name="lock" size={18} />{t.checkout.pay} · <span className="num">{new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(result.quote.total / 100)}</span>
              </SubmitButton>
              <p className="muted small center" style={{ margin: 0 }}>
                <Icon name="shield" size={15} className="inline" /> {t.checkout.secure} {fmt(t.checkout.holdNote, { n: config.holdMinutes })}
              </p>
            </form>
          ) : null}
        </div>

        <aside className="card card-pad stack">
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{t.checkout.yourStay}</h2>
          <div className="stay-summary">
            {cover && <img src={cover} alt="" width={120} height={90} />}
            <div>
              <strong style={{ fontFamily: "var(--font-head)", color: "var(--green)" }}>{title}</strong>
              <div className="muted small">{locale === "ar" ? listing.district_ar : listing.district_en}{locale === "ar" ? "، " : ", "}{locale === "ar" ? city.name_ar : city.name_en}</div>
            </div>
          </div>
          <dl className="kv">
            <div><dt>{t.checkout.dates}</dt><dd>{checkIn && checkOut && checkOut > checkIn ? dateRange(checkIn, checkOut, locale) : "—"}</dd></div>
            <div><dt>{t.checkout.guests}</dt><dd>{guests}</dd></div>
            {result.ok && <div><dt>{t.widget.nights}</dt><dd>{fmt(t.checkout.nightsCount, { n: result.quote.nights })}</dd></div>}
          </dl>
          <Link href={backToListing} className="small">{t.checkout.edit}</Link>
          {result.ok && (
            <>
              <h3 style={{ margin: "0.5rem 0 0" }}>{t.checkout.priceTitle}</h3>
              <PriceBreakdown q={result.quote} locale={locale} t={t} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
