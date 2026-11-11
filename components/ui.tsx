import { config } from "@/lib/config";
import Link from "next/link";
import { Icon } from "./Icon";
import { money, rating as fmtRating } from "@/lib/format";
import { fmt, type Dict, type Locale } from "@/lib/i18n";
import type { ListingCard as Card } from "@/lib/data/listings";
import type { Quote } from "@/lib/pricing";
import { PriceBreakdownClient } from "./PriceBreakdownClient";

export function Alert({ kind = "info", children }: { kind?: "error" | "ok" | "warn" | "info"; children: React.ReactNode }) {
  const icon = kind === "ok" ? "check" : kind === "error" ? "alert" : "info";
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  );
}

const STATUS_KIND: Record<string, string> = {
  confirmed: "badge-ok", approved: "badge-ok", paid: "badge-ok", refunded: "badge-mint", completed: "badge-mint",
  pending_payment: "badge-warn", pending: "badge-warn", initiated: "badge-warn", refund_pending: "badge-warn",
  cancelled: "", expired: "", rejected: "badge-danger", suspended: "badge-danger", payment_failed: "badge-danger", failed: "badge-danger",
  payment_conflict: "badge-danger",
};

export function StatusBadge({ status, t }: { status: string; t: Dict }) {
  const label = (t.status as Record<string, string>)[status] ?? status;
  return <span className={`badge ${STATUS_KIND[status] ?? ""}`}>{label}</span>;
}

export function Rating({ value, count, t }: { value: number | null; count: number; t: Dict }) {
  if (!count || value == null) return <span className="badge badge-sand">{t.listing.newListing}</span>;
  return (
    <span className="rating">
      <Icon name="star" size={15} filled />
      <span className="num">{fmtRating(value)}</span>
      <span className="muted small">({fmt(t.listing.reviewsCount, { n: count })})</span>
    </span>
  );
}

export function ListingCard({ item, locale, t, query = "", index = 0 }: { item: Card; locale: Locale; t: Dict; query?: string; index?: number }) {
  const title = locale === "ar" ? item.title_ar : item.title_en;
  const city = locale === "ar" ? item.city_ar : item.city_en;
  const district = locale === "ar" ? item.district_ar : item.district_en;
  const rooms = item.unit_type === "studio" || item.bedrooms === 0 ? (locale === "ar" ? "استوديو" : "Studio") : item.bedrooms === 1 ? t.listing.bedroom1 : fmt(t.listing.bedrooms, { n: item.bedrooms });
  return (
    <Link href={`/${locale}/apartments/${item.slug}${query}`} className="lcard" style={{ ["--i" as string]: index }}>
      <div className="lcard-media">
        {item.cover && <img src={item.cover} alt={title} width={800} height={600} loading="lazy" decoding="async" />}
        {item.is_demo && config.demoMode ? <span className="badge badge-dark">{t.demo.data}</span> : null}
        {item.is_demo && config.demoMode ? <span className="photo-note">{t.demo.illustration}</span> : null}
      </div>
      <div className="lcard-body">
        <div className="spread">
          <span className="lcard-meta"><Icon name="pin" size={14} className="inline" /> {district}{locale === "ar" ? "، " : ", "}{city}</span>
          <Rating value={item.rating} count={item.reviews} t={t} />
        </div>
        <h3 className="lcard-title">{title}</h3>
        <span className="lcard-meta">{rooms} · {fmt(t.listing.guests, { n: item.max_guests })}</span>
        <div className="lcard-price">
          <strong>{money(item.base_price, locale)}</strong> <span className="muted">{t.results.perNight}</span>
          {item.quoteTotal != null && item.quoteNights ? (
            <div className="small muted">{fmt(t.results.totalFor, { total: money(item.quoteTotal, locale), n: item.quoteNights })}</div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function PriceBreakdown({ q, locale, t }: { q: Quote; locale: Locale; t: Dict }) {
  return <PriceBreakdownClient q={q} locale={locale} t={t.widget} />;
}

export function EmptyState({ icon = "search", title, text, action }: { icon?: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="empty card">
      <div className="ico"><Icon name={icon} size={28} /></div>
      <h2 style={{ fontSize: "1.25rem" }}>{title}</h2>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

/** Translate an error code from the query string / server into a sentence. */
export function errorText(t: Dict, code: string | undefined, n?: string | number): string | null {
  if (!code) return null;
  const msg = (t.errors as Record<string, string>)[code];
  if (!msg) return t.errors.generic;
  return n != null ? fmt(msg, { n }) : msg.replace("{n}", "");
}
