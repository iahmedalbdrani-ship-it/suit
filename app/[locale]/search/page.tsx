import Link from "next/link";
import type { Metadata } from "next";
import { SearchBar } from "@/components/SearchBar";
import { ListingCard, EmptyState } from "@/components/ui";
import { Icon, Chevron } from "@/components/Icon";
import { fmt, getDict, resolveLocale, type Dict, type Locale } from "@/lib/i18n";
import { AMENITIES, PROPERTY_TYPES, getCities, getCity, searchListings, type SearchParams } from "@/lib/data/listings";
import { todayInRiyadh } from "@/lib/dates";
import { pageMeta } from "@/lib/seo";

type SP = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SP> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const num = (v: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDict(locale);
  const city = await getCity(one((await searchParams).city));
  const title = city ? fmt(t.results.titleIn, { city: locale === "ar" ? city.name_ar : city.name_en }) : t.results.title;
  return pageMeta(locale, city ? `/search?city=${city.slug}` : "/search", title, t.meta.homeDescription);
}

function Filters({ sp, t, locale, idp }: { sp: SP; t: Dict; locale: Locale; idp: string }) {
  const amen = new Set(many(sp.amenities));
  return (
    <form method="get" action={`/${locale}/search`} className="filters card card-pad" aria-label={t.results.filters}>
      {["city", "checkIn", "checkOut", "guests"].map((k) => one(sp[k]) && <input key={k} type="hidden" name={k} value={one(sp[k])} />)}
      <h2>{t.results.filters}</h2>
      <fieldset className="filter-group">
        <legend className="label">{t.results.price}</legend>
        <div className="grid-2">
          <label className="field"><span className="sr-only">{t.results.min}</span><input className="input" type="number" min={0} step={10} name="minPrice" placeholder={t.results.min} defaultValue={one(sp.minPrice)} inputMode="numeric" /></label>
          <label className="field"><span className="sr-only">{t.results.max}</span><input className="input" type="number" min={0} step={10} name="maxPrice" placeholder={t.results.max} defaultValue={one(sp.maxPrice)} inputMode="numeric" /></label>
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend className="label">{t.results.type}</legend>
        <div className="chips">
          {["", ...PROPERTY_TYPES].map((v) => (
            <label className="chip-input" key={v}>
              <input type="radio" name="type" value={v} defaultChecked={one(sp.type) === v} />
              <span>{v === "" ? t.results.typeAny : v === "studio" ? t.listing.typeStudio : t.listing.typeApartment}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend className="label">{t.results.bedrooms}</legend>
        <div className="chips">
          {["", "1", "2", "3", "4"].map((v) => (
            <label className="chip-input" key={v}>
              <input type="radio" name="bedrooms" value={v} defaultChecked={one(sp.bedrooms) === v} id={`${idp}-br-${v}`} />
              <span>{v ? fmt(t.results.plus, { n: v }) : t.results.any}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend className="label">{t.results.rating}</legend>
        <div className="chips">
          {["", "4", "4.5", "4.8"].map((v) => (
            <label className="chip-input" key={v}>
              <input type="radio" name="minRating" value={v} defaultChecked={one(sp.minRating) === v} />
              <span>{v ? <><Icon name="star" size={13} filled />{fmt(t.results.ratingAtLeast, { n: v })}</> : t.results.any}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend className="label">{t.results.amenities}</legend>
        <div className="chips">
          {AMENITIES.map((a) => (
            <label className="chip-input" key={a}>
              <input type="checkbox" name="amenities" value={a} defaultChecked={amen.has(a)} />
              <span><Icon name={a} size={14} />{t.amenities[a]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>{t.results.sort}</span>
        <select name="sort" className="select" defaultValue={one(sp.sort) || "recommended"}>
          <option value="recommended">{t.results.sortRecommended}</option>
          <option value="price_asc">{t.results.sortPriceAsc}</option>
          <option value="price_desc">{t.results.sortPriceDesc}</option>
          <option value="rating">{t.results.sortRating}</option>
        </select>
      </label>
      <div className="row">
        <button className="btn" type="submit">{t.results.apply}</button>
        <Link className="btn btn-ghost" href={`/${locale}/search?${new URLSearchParams(Object.fromEntries(["city", "checkIn", "checkOut", "guests"].filter((k) => one(sp[k])).map((k) => [k, one(sp[k])]))).toString()}`}>{t.results.reset}</Link>
      </div>
    </form>
  );
}

export default async function SearchPage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const cities = await getCities();
  const city = await getCity(one(sp.city));
  const sort = one(sp.sort);
  const query: SearchParams = {
    city: city?.slug,
    type: (PROPERTY_TYPES as readonly string[]).includes(one(sp.type)) ? (one(sp.type) as SearchParams["type"]) : undefined,
    checkIn: one(sp.checkIn) || undefined,
    checkOut: one(sp.checkOut) || undefined,
    guests: num(one(sp.guests)),
    minPrice: num(one(sp.minPrice)),
    maxPrice: num(one(sp.maxPrice)),
    bedrooms: num(one(sp.bedrooms)),
    minRating: num(one(sp.minRating)),
    amenities: many(sp.amenities),
    sort: (["recommended", "price_asc", "price_desc", "rating"].includes(sort) ? sort : "recommended") as SearchParams["sort"],
    page: num(one(sp.page)),
  };
  const res = await searchListings(query);
  const title = city ? fmt(t.results.titleIn, { city: locale === "ar" ? city.name_ar : city.name_en }) : t.results.title;
  const carry = new URLSearchParams();
  for (const k of ["checkIn", "checkOut", "guests"]) if (one(sp[k])) carry.set(k, one(sp[k]));
  const cardQuery = res.datesValid && carry.toString() ? `?${carry}` : "";
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of many(v)) if (k !== "page") u.append(k, x);
    u.set("page", String(p));
    return `/${locale}/search?${u}`;
  };
  const rtl = locale === "ar";

  return (
    <div className="container" style={{ paddingBlock: "1.5rem 3rem" }}>
      <SearchBar
        compact
        locale={locale}
        today={todayInRiyadh()}
        cities={cities.map((c) => ({ slug: c.slug, name: locale === "ar" ? c.name_ar : c.name_en }))}
        initial={{ city: city?.slug, checkIn: query.checkIn, checkOut: query.checkOut, guests: query.guests }}
        labels={{ where: t.search.where, anyCity: t.search.anyCity, checkIn: t.search.checkIn, checkOut: t.search.checkOut, guests: t.search.guests, submit: t.search.submit, title: t.search.title }}
      />
      <div className="spread" style={{ marginBlock: "2rem 1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", margin: 0 }}>{title}</h1>
          <p className="muted" style={{ margin: 0 }} aria-live="polite">
            {res.total ? fmt(t.results.count, { n: res.total }) : t.results.countNone}
            {!res.datesValid && res.total ? ` · ${t.results.datesHint}` : ""}
          </p>
        </div>
      </div>
      <div className="results-layout">
        <aside className="filters-desktop"><Filters sp={sp} t={t} locale={locale} idp="d" /></aside>
        <details className="filters-mobile">
          <summary className="btn btn-outline"><Icon name="menu" size={16} />{t.results.showFilters}</summary>
          <Filters sp={sp} t={t} locale={locale} idp="m" />
        </details>
        <section aria-label={title}>
          {res.items.length ? (
            <>
              <div className="listing-grid">
                {res.items.map((item, i) => <ListingCard key={item.id} item={item} locale={locale} t={t} query={cardQuery} index={i} />)}
              </div>
              {res.pages > 1 && (
                <nav className="pager" aria-label="pagination">
                  {res.page > 1 && <Link className="btn btn-outline btn-sm" href={pageHref(res.page - 1)}><Chevron dir="back" rtl={rtl} size={16} />{t.results.prev}</Link>}
                  <span className="muted small">{fmt(t.results.page, { n: res.page, total: res.pages })}</span>
                  {res.page < res.pages && <Link className="btn btn-outline btn-sm" href={pageHref(res.page + 1)}>{t.results.next}<Chevron dir="forward" rtl={rtl} size={16} /></Link>}
                </nav>
              )}
            </>
          ) : (
            <EmptyState title={t.results.emptyTitle} text={t.results.emptyText} action={<Link className="btn" href={`/${locale}/search`}>{t.results.reset}</Link>} />
          )}
        </section>
      </div>
    </div>
  );
}
