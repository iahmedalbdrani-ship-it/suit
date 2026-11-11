import Link from "next/link";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookingsForHost } from "@/lib/data/bookings";
import { hostCancelAction, togglePauseAction } from "@/app/actions/host";
import { Alert, EmptyState, StatusBadge, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { dateRange, money } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { todayInRiyadh, nightsOf } from "@/lib/dates";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/host", getDict(locale).host.title, undefined, { noindex: true });
}

type Row = { id: number; slug: string; title_ar: string; title_en: string; status: string; paused: number; base_price: number; review_note: string | null; cover: string | null; city_ar: string; city_en: string };

export default async function HostPage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const user = await requireRole(locale, ["host", "admin"], `/${locale}/host`);
  const tab = ["overview", "listings", "bookings"].includes(sp.tab ?? "") ? sp.tab! : "overview";
  const listings = await db().prepare(`SELECT l.id, l.slug, l.title_ar, l.title_en, l.status, l.paused, l.base_price, l.review_note, c.name_ar AS city_ar, c.name_en AS city_en,
    (SELECT url FROM photos p WHERE p.listing_id = l.id ORDER BY p.sort, p.id LIMIT 1) AS cover
    FROM listings l JOIN cities c ON c.slug = l.city_slug WHERE l.host_id = ? ORDER BY l.created_at DESC`).all(user.id) as Row[];
  const bookings = await bookingsForHost(user.id);
  const today = todayInRiyadh();
  const month = today.slice(0, 7);
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const upcoming = confirmed.filter((b) => b.check_out > today);
  const nightsThisMonth = confirmed.reduce((s, b) => s + nightsOf(b.check_in, b.check_out).filter((d) => d.startsWith(month)).length, 0);
  const revenueThisMonth = confirmed.filter((b) => b.check_in.startsWith(month)).reduce((s, b) => s + b.total, 0);
  const T = (x: Row) => (locale === "ar" ? x.title_ar : x.title_en);

  const BookingsTable = ({ rows }: { rows: typeof bookings }) => rows.length ? (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>{t.booking.code}</th><th>{t.host.listing}</th><th>{t.host.guest}</th><th>{t.host.dates}</th><th>{t.host.total}</th><th>{t.host.status}</th><th>{t.host.actions}</th></tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td dir="ltr" className="small">{b.code}</td>
              <td>{locale === "ar" ? b.title_ar : b.title_en}</td>
              <td>{b.guest_name}<div className="muted xs" dir="ltr">{b.guest_phone}</div></td>
              <td className="small">{dateRange(b.check_in, b.check_out, locale)}</td>
              <td className="num">{money(b.total, locale)}</td>
              <td><StatusBadge status={b.status} t={t} /></td>
              <td>
                <div className="row">
                  <Link className="btn btn-outline btn-sm" href={`/${locale}/bookings/${b.code}`}>{t.host.view}</Link>
                  {b.status === "confirmed" && b.check_in > today && (
                    <form action={hostCancelAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="code" value={b.code} />
                      <SubmitButton className="btn btn-danger btn-sm" confirm={t.host.cancelBooking}>{t.host.cancelBooking}</SubmitButton>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <EmptyState icon="calendar" title={t.host.noBookings} />;

  return (
    <div className="container" style={{ paddingBottom: "3rem" }}>
      <div className="dash-head spread">
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{t.host.title}</h1>
        <Link href={`/${locale}/host/listings/new`} className="btn"><Icon name="plus" size={18} />{t.host.addListing}</Link>
      </div>
      <nav className="tabs" aria-label={t.host.title}>
        {([["overview", t.host.overview], ["listings", t.host.listings], ["bookings", t.host.bookings]] as const).map(([k, label]) => (
          <Link key={k} href={`/${locale}/host?tab=${k}`} aria-current={tab === k ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {sp.ok === "host_cancelled" && <div style={{ marginBottom: "1rem" }}><Alert kind="ok">{t.host.hostCancelled}</Alert></div>}
      {sp.error && <div style={{ marginBottom: "1rem" }}><Alert kind="error">{errorText(t, sp.error)}</Alert></div>}

      {tab === "overview" && (
        <>
          <div className="stats">
            <div className="card stat"><div className="k">{t.host.statListings}</div><div className="v num">{listings.length}</div></div>
            <div className="card stat"><div className="k">{t.host.statUpcoming}</div><div className="v num">{upcoming.length}</div></div>
            <div className="card stat"><div className="k">{t.host.statNights}</div><div className="v num">{nightsThisMonth}</div></div>
            <div className="card stat"><div className="k">{t.host.statRevenue}</div><div className="v num">{money(revenueThisMonth, locale)}</div></div>
          </div>
          <h2 style={{ fontSize: "1.2rem" }}>{t.host.statUpcoming}</h2>
          <BookingsTable rows={upcoming.slice().reverse().slice(0, 8)} />
        </>
      )}

      {(sp.ok === "paused" || sp.ok === "unpaused") && <div style={{ marginBottom: "1rem" }}><Alert kind="ok">{sp.ok === "paused" ? t.host.pausedOk : t.host.unpausedOk}</Alert></div>}
      {tab === "listings" && (listings.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th></th><th>{t.host.listing}</th><th>{t.host.city}</th><th>{t.host.basePrice}</th><th>{t.host.status}</th><th>{t.host.actions}</th></tr></thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td>{l.cover ? <img className="thumb" src={l.cover} alt="" /> : <span className="thumb" />}</td>
                  <td><strong>{T(l)}</strong>{l.review_note && <div className="xs" style={{ color: "var(--danger)" }}>{t.host.reviewNote}: {l.review_note}</div>}</td>
                  <td>{locale === "ar" ? l.city_ar : l.city_en}</td>
                  <td className="num">{money(l.base_price, locale)}</td>
                  <td><StatusBadge status={l.status} t={t} />{l.paused ? <> <span className="badge badge-paused">{t.host.pausedBadge}</span></> : null}</td>
                  <td><div className="row">
                    <Link className="btn btn-outline btn-sm" href={`/${locale}/host/listings/${l.id}`}>{t.host.edit}</Link>
                    <Link className="btn btn-ghost btn-sm" href={`/${locale}/apartments/${l.slug}`}>{t.host.view}</Link>
                    <form action={togglePauseAction}>
                      <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={l.id} /><input type="hidden" name="back" value="list" />
                      <SubmitButton className="btn btn-outline btn-sm">{l.paused ? t.host.unpause : t.host.pause}</SubmitButton>
                    </form>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon="home" title={t.host.noListings} action={<Link className="btn" href={`/${locale}/host/listings/new`}>{t.host.addListing}</Link>} />)}

      {tab === "bookings" && <BookingsTable rows={bookings} />}
      {tab === "overview" && listings.some((l) => l.status === "pending") && (
        <div style={{ marginTop: "1rem" }}><Alert kind="info">{t.host.pendingNote}</Alert></div>
      )}
    </div>
  );
}
