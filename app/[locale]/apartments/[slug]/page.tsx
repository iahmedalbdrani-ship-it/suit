import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Rating } from "@/components/ui";
import { AvailabilityCalendar, BookingProvider, BookingWidget, MobileBookBar } from "@/components/BookingClient";
import { fmt, getDict, resolveLocale } from "@/lib/i18n";
import {
  getCity, getHostName, getListingBySlug, getPhotos, getReviews, parseAmenities,
} from "@/lib/data/listings";
import { getCurrentUser } from "@/lib/auth";
import { todayInRiyadh } from "@/lib/dates";
import { date, money, rating as fmtRating } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { config } from "@/lib/config";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

async function load(slug: string) {
  const listing = await getListingBySlug(slug);
  if (!listing) return null;
  if (listing.status !== "approved" || listing.paused) {
    const user = await getCurrentUser();
    if (!user || (user.id !== listing.host_id && user.role !== "admin")) return null;
  }
  return listing;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: l, slug } = await params;
  const locale = resolveLocale(l);
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "approved" || listing.paused) return { title: "404", robots: { index: false } };
  const title = locale === "ar" ? listing.title_ar : listing.title_en;
  const desc = (locale === "ar" ? listing.description_ar : listing.description_en).slice(0, 160);
  return pageMeta(locale, `/apartments/${slug}`, title, desc);
}

export default async function ApartmentPage({ params, searchParams }: Props) {
  const { locale: l, slug } = await params;
  const locale = resolveLocale(l);
  const sp = await searchParams;
  const t = getDict(locale);
  const listing = await load(slug);
  if (!listing) notFound();

  const city = (await getCity(listing.city_slug))!;
  const photos = await getPhotos(listing.id);
  const reviews = await getReviews(listing.id);
  const amenities = parseAmenities(listing);
  const title = locale === "ar" ? listing.title_ar : listing.title_en;
  const description = locale === "ar" ? listing.description_ar : listing.description_en;
  const rules = locale === "ar" ? listing.house_rules_ar : listing.house_rules_en;
  const district = locale === "ar" ? listing.district_ar : listing.district_en;
  const cityName = locale === "ar" ? city.name_ar : city.name_en;
  const hostName = await getHostName(listing.host_id);
  const lat = listing.lat ?? city.lat, lng = listing.lng ?? city.lng;
  // Approximate area only (± ~1 km) — exact address is shared after confirmation.
  const bbox = [lng - 0.03, lat - 0.02, lng + 0.03, lat + 0.02].map((v) => v.toFixed(4)).join(",");
  const rooms = listing.unit_type === "studio" || listing.bedrooms === 0 ? (locale === "ar" ? "استوديو" : "Studio") : listing.bedrooms === 1 ? t.listing.bedroom1 : fmt(t.listing.bedrooms, { n: listing.bedrooms });
  const policyText = t.policies[`${listing.cancellation_policy}Text` as "flexibleText"];
  const policyName = t.policies[listing.cancellation_policy];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: title,
    description,
    url: `${config.siteUrl}/${locale}/apartments/${listing.slug}`,
    image: photos.map((p) => `${config.siteUrl}${p.url}`),
    numberOfRooms: listing.bedrooms || 1,
    numberOfBathroomsTotal: listing.bathrooms,
    occupancy: { "@type": "QuantitativeValue", maxValue: listing.max_guests },
    floorSize: listing.area_sqm ? { "@type": "QuantitativeValue", value: listing.area_sqm, unitCode: "MTK" } : undefined,
    address: { "@type": "PostalAddress", addressLocality: cityName, addressRegion: locale === "ar" ? city.region_ar : city.region_en, addressCountry: "SA" },
    amenityFeature: amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: t.amenities[a], value: true })),
  };

  const widgetT = { widget: t.widget, search: t.search, errors: t.errors, checkout: t.checkout };

  return (
    <BookingProvider slug={listing.slug} today={todayInRiyadh()} initial={{ checkIn: sp.checkIn, checkOut: sp.checkOut, guests: sp.guests ? Number(sp.guests) : undefined }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container has-mobile-bar" style={{ paddingBlock: "1.5rem 3rem" }}>
        {listing.status !== "approved" && (
          <div className="alert alert-warn" style={{ marginBottom: "1rem" }}><Icon name="info" size={18} />{t.host.pendingNote}</div>
        )}
        <nav aria-label="breadcrumb" className="small muted" style={{ marginBottom: "0.75rem" }}>
          <Link href={`/${locale}/search`}>{t.nav.search}</Link> / <Link href={`/${locale}/search?city=${city.slug}`}>{cityName}</Link>
        </nav>
        <h1 style={{ fontSize: "clamp(1.5rem, 2vw + 1rem, 2.2rem)" }}>{title}</h1>
        <div className="spread" style={{ marginBottom: "1.25rem" }}>
          <div className="row">
            <Rating value={reviews.avg} count={reviews.count} t={t} />
            <span className="muted"><Icon name="pin" size={15} className="inline" /> {district}{locale === "ar" ? "، " : ", "}{cityName}</span>
            {listing.is_demo && config.demoMode ? <span className="badge badge-sand">{t.demo.data}</span> : null}
          </div>
        </div>

        <section className="gallery" aria-label={t.listing.gallery}>
          {photos.slice(0, 5).map((p, i) => (
            <div key={p.id}>
              <img src={p.url} alt={`${title} — ${fmt(t.listing.photo, { n: i + 1, total: photos.length })}`} width={800} height={600} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} />
            </div>
          ))}
          {listing.is_demo && config.demoMode ? <span className="photo-note">{t.demo.photosNote}</span> : null}
        </section>

        <div className="detail-layout">
          <div className="detail-main">
            <section>
              <div className="spread">
                <h2 style={{ fontSize: "1.3rem", margin: 0 }}>{fmt(t.listing.hostedBy, { name: hostName })}</h2>
                <div className="avatar" aria-hidden="true">{hostName.slice(0, 1)}</div>
              </div>
              <div className="facts" style={{ marginTop: "0.5rem" }}>
                <span><Icon name="users" size={18} />{fmt(t.listing.guests, { n: listing.max_guests })}</span>
                <span><Icon name="bed" size={18} />{rooms} · {fmt(t.listing.beds, { n: listing.beds })}</span>
                <span><Icon name="bath" size={18} />{fmt(t.listing.baths, { n: listing.bathrooms })}</span>
                {listing.area_sqm ? <span><Icon name="area" size={18} />{fmt(t.listing.area, { n: listing.area_sqm })}</span> : null}
              </div>
            </section>

            <section aria-labelledby="about-h">
              <h2 id="about-h" style={{ fontSize: "1.3rem" }}>{t.listing.about}</h2>
              <p style={{ whiteSpace: "pre-line", color: "var(--ink-2)" }}>{description}</p>
              <div className="row small">
                <span className="badge badge-mint"><Icon name="clock" size={14} />{fmt(t.listing.checkInTime, { time: listing.check_in_time })}</span>
                <span className="badge badge-mint"><Icon name="clock" size={14} />{fmt(t.listing.checkOutTime, { time: listing.check_out_time })}</span>
                {listing.min_nights > 1 && <span className="badge">{fmt(t.listing.minNights, { n: listing.min_nights })}</span>}
                {listing.weekly_discount > 0 && <span className="badge badge-sand"><Icon name="tag" size={14} />{fmt(t.listing.weeklyDiscount, { n: listing.weekly_discount })}</span>}
                {listing.monthly_discount > 0 && <span className="badge badge-sand"><Icon name="tag" size={14} />{fmt(t.listing.monthlyDiscount, { n: listing.monthly_discount })}</span>}
              </div>
            </section>

            <section aria-labelledby="amen-h">
              <h2 id="amen-h" style={{ fontSize: "1.3rem" }}>{t.listing.amenities}</h2>
              <ul className="amenity-list">
                {amenities.map((a) => <li key={a}><Icon name={a} size={22} />{t.amenities[a]}</li>)}
              </ul>
            </section>

            <section id="availability" aria-labelledby="avail-h">
              <h2 id="avail-h" style={{ fontSize: "1.3rem" }}>{t.listing.availability}</h2>
              <AvailabilityCalendar locale={locale} labels={t.listing} />
            </section>

            <section aria-labelledby="loc-h">
              <h2 id="loc-h" style={{ fontSize: "1.3rem" }}>{t.listing.location}</h2>
              <iframe
                className="map-frame"
                title={`${t.listing.location} — ${district}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
              />
              <p className="muted small" style={{ marginTop: "0.5rem" }}>{district}{locale === "ar" ? "، " : ", "}{cityName} — {t.listing.locationNote}</p>
            </section>

            <section aria-labelledby="rev-h">
              <h2 id="rev-h" style={{ fontSize: "1.3rem" }}>
                {reviews.count ? <><Icon name="star" size={20} filled className="inline" /> <span className="num">{fmtRating(reviews.avg)}</span> · {fmt(t.listing.reviewsCount, { n: reviews.count })}</> : t.listing.reviews}
              </h2>
              {reviews.count ? (
                <div className="reviews">
                  {reviews.items.slice(0, 8).map((r) => (
                    <article className="review" key={r.id} lang={r.lang}>
                      <header>
                        <div className="avatar" aria-hidden="true">{r.author_name.slice(0, 1)}</div>
                        <div>
                          <strong>{r.author_name}</strong>
                          <div className="muted xs">{date(r.created_at, locale, { month: "long", year: "numeric" })} · {"★".repeat(r.rating)}<span className="sr-only">{r.rating}/5</span></div>
                        </div>
                      </header>
                      <p>{r.comment}</p>
                    </article>
                  ))}
                </div>
              ) : <p className="muted">{t.listing.noReviews}</p>}
            </section>

            <section aria-labelledby="pol-h">
              <h2 id="pol-h" style={{ fontSize: "1.3rem" }}>{t.listing.cancellation}: {policyName}</h2>
              <p className="muted">{policyText}</p>
              {rules && (
                <>
                  <h3 style={{ marginTop: "1.25rem" }}>{t.listing.rules}</h3>
                  <p style={{ whiteSpace: "pre-line" }} className="muted">{rules}</p>
                </>
              )}
            </section>
          </div>

          <aside>
            <BookingWidget
              locale={locale}
              slug={listing.slug}
              basePrice={listing.base_price}
              maxGuests={listing.max_guests}
              t={widgetT}
              minNightsNote={listing.min_nights > 1 ? fmt(t.listing.minNights, { n: listing.min_nights }) : undefined}
            />
            <p className="muted xs center" style={{ marginTop: "0.75rem" }}>
              {t.listing.cancellation}: <strong>{policyName}</strong> · {money(listing.cleaning_fee, locale)} {t.widget.cleaning}
            </p>
          </aside>
        </div>
      </div>
      <MobileBookBar locale={locale} basePrice={listing.base_price} perNight={t.widget.perNight} cta={t.widget.reserve} choose={t.widget.chooseDates} />
    </BookingProvider>
  );
}
