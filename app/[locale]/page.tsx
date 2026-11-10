import Link from "next/link";
import type { Metadata } from "next";
import { SearchBar } from "@/components/SearchBar";
import { ListingCard, Alert, errorText } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { fmt, getDict, resolveLocale } from "@/lib/i18n";
import { getCities, getFeatured, getListingById, rates } from "@/lib/data/listings";
import { addDays, todayInRiyadh } from "@/lib/dates";
import { computeQuote } from "@/lib/pricing";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { config } from "@/lib/config";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDict(locale);
  return { ...pageMeta(locale, "/", t.meta.homeTitle, t.meta.homeDescription), title: { absolute: t.meta.homeTitle } };
}

export default async function Home({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const cities = await getCities();
  const featured = await getFeatured(8);
  const L = (p: string) => `/${locale}${p}`;
  const today = todayInRiyadh();

  // Real numbers from the database — no invented stats.
  const stats = await db().prepare(`SELECT
      (SELECT COUNT(*) FROM listings WHERE status = 'approved') AS listings,
      (SELECT COUNT(DISTINCT city_slug) FROM listings WHERE status = 'approved') AS cities,
      (SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN listings l ON l.id = r.listing_id WHERE l.status = 'approved') AS rating`).get() as { listings: number; cities: number; rating: number | null };

  // Illustrative breakdown from a real listing's pricing rules.
  const sample = featured[0] ? await getListingById(featured[0].id) : undefined;
  const sampleQ = sample ? computeQuote(sample, addDays(today, 30), addDays(today, 33), new Map(), rates()) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Suitly",
    url: config.siteUrl,
    inLanguage: ["ar", "en"],
    potentialAction: { "@type": "SearchAction", target: `${config.siteUrl}/${locale}/search?city={city}`, "query-input": "required name=city" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero">
        <div className="container hero-v2">
          <div className="reveal">
            <span className="kicker" style={{ ["--i" as string]: 0 }}><span className="live-dot" aria-hidden="true" />{fmt(t.home.liveNow, { n: stats.listings })}</span>
            <h1 style={{ ["--i" as string]: 1 }}>{t.home.heroTitleA} <em>{t.home.heroTitleB}</em></h1>
            <p className="lead" style={{ ["--i" as string]: 2 }}>{t.home.heroText}</p>
            <div className="hero-stats" style={{ ["--i" as string]: 3 }}>
              <div><strong className="num">{stats.listings}</strong><span>{t.home.statListings}</span></div>
              <div><strong className="num">{stats.cities}</strong><span>{t.home.statCities}</span></div>
              {stats.rating != null && <div><strong className="num">{stats.rating}</strong><span>{t.home.statRating}</span></div>}
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="arch"><img src="/art/living-1.svg" alt="" width={800} height={600} fetchPriority="high" /></div>
            <div className="chip-float chip-a"><Icon name="receipt" /><span><strong>{t.home.trust1Title}</strong></span></div>
            <div className="chip-float chip-b"><Icon name="shield" /><span><strong>{t.home.trust2Title}</strong></span></div>
          </div>
        </div>
      </section>

      <div className="container" style={{ position: "relative", zIndex: 2, marginTop: "-3.4rem" }}>
        <SearchBar
          locale={locale}
          today={today}
          cities={cities.map((c) => ({ slug: c.slug, name: locale === "ar" ? c.name_ar : c.name_en }))}
          labels={{ where: t.search.where, anyCity: t.search.anyCity, checkIn: t.search.checkIn, checkOut: t.search.checkOut, guests: t.search.guests, submit: t.search.submit, title: t.search.title }}
        />
        {sp.error && <div style={{ marginTop: "1rem" }}><Alert kind="error">{errorText(t, sp.error)}</Alert></div>}
      </div>

      <section className="section container" aria-labelledby="cities-h">
        <div className="section-head">
          <div><span className="eyebrow">{t.home.citiesEyebrow}</span><h2 id="cities-h">{t.home.popularCities}</h2><p>{t.home.popularCitiesText}</p></div>
        </div>
        <div className="city-grid">
          {cities.map((c) => (
            <Link key={c.slug} href={L(`/search?city=${c.slug}`)} className="city-card">
              <img src={`/art/city-${c.slug}.svg`} alt="" width={800} height={600} loading="lazy" />
              <strong>{locale === "ar" ? c.name_ar : c.name_en}</strong>
              <span>{fmt(t.home.listingsCount, { n: c.listings ?? 0 })}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container" aria-labelledby="featured-h" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div><span className="eyebrow">{t.home.featuredEyebrow}</span><h2 id="featured-h">{t.home.featured}</h2><p>{t.home.featuredText}</p></div>
          <Link href={L("/search")} className="btn btn-outline">{t.home.viewAll}</Link>
        </div>
        <div className="listing-grid listing-rail">
          {featured.map((item, i) => <ListingCard key={item.id} item={item} locale={locale} t={t} index={i} />)}
        </div>
      </section>

      <section className="section container" aria-labelledby="how-h">
        <span className="eyebrow">{t.home.howEyebrow}</span>
        <h2 id="how-h" style={{ marginBottom: "1.5rem" }}>{t.home.howTitle}</h2>
        <div className="bento">
          <article className="tile feature">
            <div>
              <span className="step-n">02</span>
              <h3 style={{ marginTop: ".5rem" }}>{t.home.how2Title}</h3>
              <p>{t.home.how2Text}</p>
            </div>
            {sampleQ && (
              <div className="receipt" aria-label={t.widget.priceDetails}>
                <div><span>{fmt(t.widget.nightsX, { price: money(sampleQ.avgNightly, locale), n: sampleQ.nights })}</span><span className="num">{money(sampleQ.nightsTotal, locale)}</span></div>
                <div><span>{t.widget.cleaning}</span><span className="num">{money(sampleQ.cleaningFee, locale)}</span></div>
                <div><span>{t.widget.service}</span><span className="num">{money(sampleQ.serviceFee, locale)}</span></div>
                <div><span>{fmt(t.widget.vat, { rate: Math.round(sampleQ.vatRate * 100) })}</span><span className="num">{money(sampleQ.vat, locale)}</span></div>
                <div className="t"><span>{t.widget.total}</span><span className="num">{money(sampleQ.total, locale)}</span></div>
              </div>
            )}
          </article>
          <article className="tile wide">
            <div className="ico"><Icon name="search" size={22} /></div>
            <div><span className="step-n">01</span><h3 style={{ marginTop: ".4rem" }}>{t.home.how1Title}</h3><p>{t.home.how1Text}</p></div>
          </article>
          <article className="tile sand">
            <div className="ico"><Icon name="check" size={22} /></div>
            <div><span className="step-n">03</span><h3 style={{ marginTop: ".4rem" }}>{t.home.how3Title}</h3><p>{t.home.how3Text}</p></div>
          </article>
          <article className="tile">
            <div className="ico"><Icon name="clock" size={22} /></div>
            <div><h3>{t.home.trust3Title}</h3><p>{t.home.trust3Text}</p></div>
          </article>
        </div>
      </section>

      <section className="section container" aria-labelledby="trust-h" style={{ paddingTop: 0 }}>
        <span className="eyebrow">{t.home.trustEyebrow}</span>
        <h2 id="trust-h" style={{ marginBottom: "1.5rem" }}>{t.home.trustTitle}</h2>
        <div className="bento">
          <article className="tile wide sand">
            <div className="ico"><Icon name="shield" size={22} /></div>
            <div><h3>{t.home.trust2Title}</h3><p>{t.home.trust2Text}</p></div>
          </article>
          <article className="tile">
            <div className="ico"><Icon name="lock" size={22} /></div>
            <div><h3>{t.home.trust4Title}</h3><p>{t.home.trust4Text}</p></div>
          </article>
          <article className="tile wide">
            <div className="ico"><Icon name="receipt" size={22} /></div>
            <div><h3>{t.home.trust1Title}</h3><p>{t.home.trust1Text}</p></div>
          </article>
          <Link href={L("/become-host")} className="tile" style={{ textDecoration: "none", background: "var(--green)", borderColor: "var(--green)" }}>
            <div className="ico" style={{ background: "rgba(114,182,162,.18)", color: "var(--mint)" }}><Icon name="home" size={22} /></div>
            <div><h3 style={{ color: "#fff" }}>{t.home.hostTitle}</h3><p style={{ color: "#b9d2ca" }}>{t.home.hostCta}</p></div>
          </Link>
        </div>
      </section>
    </>
  );
}
