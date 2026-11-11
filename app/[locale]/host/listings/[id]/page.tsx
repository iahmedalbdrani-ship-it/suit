import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDict, resolveLocale, intlTag } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCities, getListingById, getPhotos, unavailableNights } from "@/lib/data/listings";
import { bookingsForHost } from "@/lib/data/bookings";
import { calendarAction, photoAction, togglePauseAction, uploadPhotosAction } from "@/app/actions/host";
import { PhotoUploader } from "@/components/PhotoUploader";
import { photoLabels } from "@/lib/photo-labels";
import { ListingForm } from "@/components/ListingForm";
import { Alert, StatusBadge, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Chevron, Icon } from "@/components/Icon";
import { addDays, addMonths, daysInMonth, monthStart, todayInRiyadh, weekday } from "@/lib/dates";
import { dateRange, money, sar } from "@/lib/format";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: l, id } = await params;
  const locale = resolveLocale(l);
  return pageMeta(locale, `/host/listings/${id}`, getDict(locale).host.editListing, undefined, { noindex: true });
}

export default async function EditListing({ params, searchParams }: Props) {
  const { locale: l, id } = await params;
  const locale = resolveLocale(l);
  const sp = await searchParams;
  const t = getDict(locale);
  const user = await requireRole(locale, ["host", "admin"], `/${locale}/host/listings/${id}`);
  const listing = await getListingById(Number(id));
  if (!listing || (listing.host_id !== user.id && user.role !== "admin")) notFound();
  const photos = await getPhotos(listing.id);
  const today = todayInRiyadh();
  const horizon = addMonths(today, 3);
  const booked = new Set(await unavailableNights(listing.id, monthStart(today), horizon));
  const days = await db().prepare("SELECT date, blocked, price FROM calendar_days WHERE listing_id = ? AND date >= ? AND date < ?")
    .all(listing.id, monthStart(today), horizon) as { date: string; blocked: number; price: number | null }[];
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const bookings = await bookingsForHost(listing.host_id, listing.id);
  const okMsg = { saved: t.host.saved, created: t.host.created, calendar: t.host.calUpdated, paused: t.host.pausedOk, unpaused: t.host.unpausedOk }[sp.ok ?? ""];
  const title = locale === "ar" ? listing.title_ar : listing.title_en;
  const dows = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(intlTag(locale), { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + i))));

  return (
    <div className="container" style={{ paddingBottom: "3rem", maxWidth: 1040 }}>
      <div className="dash-head">
        <Link href={`/${locale}/host?tab=listings`} className="small row" style={{ gap: "0.25rem" }}><Chevron dir="back" rtl={locale === "ar"} size={16} />{t.host.listings}</Link>
        <div className="spread" style={{ marginTop: "0.5rem" }}>
          <h1 style={{ fontSize: "1.7rem", margin: 0 }}>{title}</h1>
          <div className="row">
            <StatusBadge status={listing.status} t={t} />
            {listing.paused ? <span className="badge badge-paused">{t.host.pausedBadge}</span> : null}
            <form action={togglePauseAction}>
              <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={listing.id} />
              <SubmitButton className="btn btn-outline btn-sm">{listing.paused ? t.host.unpause : t.host.pause}</SubmitButton>
            </form>
            <Link className="btn btn-outline btn-sm" href={`/${locale}/apartments/${listing.slug}`}>{t.host.view}</Link>
          </div>
        </div>
      </div>
      {listing.paused ? <div style={{ marginBottom: "1rem" }}><Alert kind="warn">{t.host.pausedNote}</Alert></div> : null}
      {listing.status === "pending" && <div style={{ marginBottom: "1rem" }}><Alert kind="info">{t.host.pendingNote}</Alert></div>}
      {listing.review_note && <div style={{ marginBottom: "1rem" }}><Alert kind="warn">{t.host.reviewNote}: {listing.review_note}</Alert></div>}
      {okMsg && <div style={{ marginBottom: "1rem" }}><Alert kind="ok">{okMsg}</Alert></div>}
      {sp.error && <div style={{ marginBottom: "1rem" }}><Alert kind="error">{errorText(t, sp.error)}</Alert></div>}

      <section id="photos" className="card card-pad stack" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{t.host.sectionPhotos}</h2>
        {photos.length ? (
          <div className="photo-grid">
            {photos.map((p, i) => (
              <figure key={p.id}>
                <img src={p.url} alt="" width={320} height={240} loading="lazy" />
                <figcaption>
                  {i === 0 ? <span className="badge badge-mint">{t.host.cover}</span> : (
                    <form action={photoAction}>
                      <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={listing.id} />
                      <input type="hidden" name="photoId" value={p.id} /><input type="hidden" name="op" value="cover" />
                      <SubmitButton className="btn btn-ghost btn-sm">{t.host.makeCover}</SubmitButton>
                    </form>
                  )}
                  {(["left", "right"] as const).map((op) => (op === "left" ? i > 0 : i < photos.length - 1) && (
                    <form action={photoAction} key={op}>
                      <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={listing.id} />
                      <input type="hidden" name="photoId" value={p.id} /><input type="hidden" name="op" value={op} />
                      <SubmitButton className="btn btn-ghost btn-sm" aria-label={op === "left" ? t.host.moveEarlier : t.host.moveLater}>{op === "left" ? (locale === "ar" ? "→" : "←") : (locale === "ar" ? "←" : "→")}</SubmitButton>
                    </form>
                  ))}
                  <form action={photoAction}>
                    <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={listing.id} />
                    <input type="hidden" name="photoId" value={p.id} /><input type="hidden" name="op" value="delete" />
                    <SubmitButton className="btn btn-danger btn-sm" confirm={t.host.deletePhoto}><Icon name="trash" size={14} />{t.host.deletePhoto}</SubmitButton>
                  </form>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : <p className="muted">{t.host.noPhotos}</p>}
        <form action={uploadPhotosAction} className="stack" encType="multipart/form-data">
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={listing.id} />
          <PhotoUploader labels={photoLabels(t)} existing={photos.length} />
          <div><SubmitButton className="btn"><Icon name="image" size={18} />{t.host.upload}</SubmitButton></div>
        </form>
      </section>

      <section id="calendar" className="card card-pad stack" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{t.host.sectionCalendar}</h2>
        <form action={calendarAction} className="grid-4" style={{ alignItems: "end" }}>
          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={listing.id} />
          <label className="field"><span>{t.host.rangeFrom}</span><input className="input" type="date" name="from" min={today} required /></label>
          <label className="field"><span>{t.host.rangeTo}</span><input className="input" type="date" name="to" min={today} /></label>
          <label className="field"><span>{t.host.calAction}</span>
            <select className="select" name="op">
              <option value="block">{t.host.calBlock}</option>
              <option value="unblock">{t.host.calUnblock}</option>
              <option value="price">{t.host.calPrice}</option>
              <option value="clear">{t.host.calClearPrice}</option>
            </select>
          </label>
          <label className="field"><span>{t.host.calPriceValue}</span><input className="input" name="price" inputMode="decimal" dir="ltr" placeholder={sar(listing.base_price)} /></label>
          <div><SubmitButton className="btn">{t.host.calApply}</SubmitButton></div>
        </form>
        <div className="hcal">
          {[0, 1, 2].map((m) => {
            const start = addMonths(today, m);
            const n = daysInMonth(start);
            return (
              <div key={m}>
                <h3 style={{ fontSize: "0.95rem", textAlign: "center" }}>{new Intl.DateTimeFormat(intlTag(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${start}T00:00:00Z`))}</h3>
                <div className="cal-grid">
                  {dows.map((d, i) => <div key={i} className="dow">{d}</div>)}
                  {Array.from({ length: weekday(start) }, (_, i) => <span key={`x${i}`} />)}
                  {Array.from({ length: n }, (_, i) => {
                    const d = addDays(start, i);
                    const info = dayMap.get(d);
                    const blocked = info?.blocked === 1;
                    const isBooked = booked.has(d) && !blocked;
                    const cls = ["cell", isBooked && "booked", blocked && "blocked", info?.price != null && "price", d < today && "past"].filter(Boolean).join(" ");
                    return (
                      <div key={d} className={cls} title={d}>
                        <span className="num">{i + 1}{info?.price != null && <small>{sar(info.price)}</small>}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="cal-legend">
          <span><i style={{ background: "var(--green)" }} />{t.host.legendBooked}</span>
          <span><i style={{ background: "#e6e9ef" }} />{t.host.legendBlocked}</span>
          <span><i style={{ boxShadow: "inset 0 0 0 2px var(--sand)" }} />{t.host.legendPrice}</span>
        </div>
      </section>

      {bookings.length > 0 && (
        <section className="card card-pad stack" style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{t.host.bookings}</h2>
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {bookings.slice(0, 10).map((b) => (
              <li key={b.id} className="spread small">
                <span><Link href={`/${locale}/bookings/${b.code}`} dir="ltr">{b.code}</Link> · {b.guest_name} · {dateRange(b.check_in, b.check_out, locale)}</span>
                <span className="row"><span className="num">{money(b.total, locale)}</span><StatusBadge status={b.status} t={t} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ListingForm locale={locale} t={t} cities={await getCities()} listing={listing} />
    </div>
  );
}
