import Link from "next/link";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { allBookings, latestPayment } from "@/lib/data/bookings";
import { adminCancelAction, listingStatusAction, messageAction, refundAction, roleAction } from "@/app/actions/admin";
import { Alert, EmptyState, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { date, dateRange, dateTime, money } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import { todayInRiyadh } from "@/lib/dates";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/admin", getDict(locale).admin.title, undefined, { noindex: true });
}

type LRow = { id: number; slug: string; title_ar: string; title_en: string; status: string; base_price: number; host: string; host_email: string; city_ar: string; city_en: string; created_at: string; review_note: string | null; cover: string | null; is_demo: number };

export default async function AdminPage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const me = await requireRole(locale, ["admin"], `/${locale}/admin`);
  const tab = ["overview", "listings", "bookings", "users", "messages"].includes(sp.tab ?? "") ? sp.tab! : "overview";
  const one = async <T,>(sql: string, ...a: (string | number)[]) => (await db().prepare(sql).get(...a)) as T;
  const [users, live, pending, confirmed, gmv, attention] = await Promise.all([
    one<{ n: number }>("SELECT COUNT(*) n FROM users"),
    one<{ n: number }>("SELECT COUNT(*) n FROM listings WHERE status='approved'"),
    one<{ n: number }>("SELECT COUNT(*) n FROM listings WHERE status='pending'"),
    one<{ n: number }>("SELECT COUNT(*) n FROM bookings WHERE status='confirmed'"),
    one<{ n: number | null }>("SELECT SUM(total) n FROM bookings WHERE status='confirmed'"),
    one<{ n: number }>("SELECT COUNT(*) n FROM bookings b WHERE b.status='payment_conflict' OR EXISTS (SELECT 1 FROM payments p WHERE p.booking_id=b.id AND p.status='refund_pending')"),
  ]);
  const stats = { users: users.n, live: live.n, pending: pending.n, confirmed: confirmed.n, gmv: gmv.n ?? 0, attention: attention.n };
  const filter = sp.filter && ["pending", "approved", "rejected", "suspended"].includes(sp.filter) ? sp.filter : "";
  const H = (k: string, label: string) => <Link key={k} href={`/${locale}/admin?tab=${k}`} aria-current={tab === k ? "page" : undefined}>{label}</Link>;
  const today = todayInRiyadh();

  return (
    <div className="container" style={{ paddingBottom: "3rem" }}>
      <div className="dash-head"><h1 style={{ fontSize: "1.8rem", margin: 0 }}>{t.admin.title}</h1></div>
      <nav className="tabs" aria-label={t.admin.title}>
        {H("overview", t.admin.overview)}{H("listings", `${t.admin.listings}${stats.pending ? ` (${stats.pending})` : ""}`)}{H("bookings", t.admin.bookings)}{H("users", t.admin.users)}{H("messages", t.admin.messages)}
      </nav>
      {sp.ok && <div style={{ marginBottom: "1rem" }}><Alert kind="ok">{t.admin.updated}</Alert></div>}

      {tab === "overview" && (
        <div className="stats">
          <div className="card stat"><div className="k">{t.admin.statUsers}</div><div className="v num">{stats.users}</div></div>
          <div className="card stat"><div className="k">{t.admin.statListings}</div><div className="v num">{stats.live}</div></div>
          <Link href={`/${locale}/admin?tab=listings&filter=pending`} className="card stat" style={{ textDecoration: "none" }}><div className="k">{t.admin.statPending}</div><div className="v num">{stats.pending}</div></Link>
          <div className="card stat"><div className="k">{t.admin.statBookings}</div><div className="v num">{stats.confirmed}</div></div>
          <div className="card stat"><div className="k">{t.admin.statGmv}</div><div className="v num">{money(stats.gmv, locale)}</div></div>
          <Link href={`/${locale}/admin?tab=bookings&status=payment_conflict`} className="card stat" style={{ textDecoration: "none" }}><div className="k">{t.admin.statAttention}</div><div className="v num" style={{ color: stats.attention ? "var(--danger)" : undefined }}>{stats.attention}</div></Link>
        </div>
      )}

      {tab === "listings" && (await (async () => {
        const rows = await db().prepare(`SELECT l.id, l.slug, l.title_ar, l.title_en, l.status, l.base_price, l.created_at, l.review_note, l.is_demo, u.name host, u.email host_email,
          c.name_ar city_ar, c.name_en city_en, (SELECT url FROM photos p WHERE p.listing_id = l.id ORDER BY p.sort, p.id LIMIT 1) cover
          FROM listings l JOIN users u ON u.id = l.host_id JOIN cities c ON c.slug = l.city_slug
          ${filter ? "WHERE l.status = ?" : ""} ORDER BY CASE l.status WHEN 'pending' THEN 0 ELSE 1 END, l.created_at DESC`).all(...(filter ? [filter] : [])) as LRow[];
        return (
          <>
            <div className="row" style={{ marginBottom: "1rem" }}>
              {["", "pending", "approved", "rejected", "suspended"].map((f) => (
                <Link key={f} className={`btn btn-sm ${filter === f ? "" : "btn-outline"}`} href={`/${locale}/admin?tab=listings${f ? `&filter=${f}` : ""}`}>{f ? (t.status as Record<string, string>)[f] : t.admin.all}</Link>
              ))}
            </div>
            <div className="stack">
              {rows.map((l) => (
                <article key={l.id} className="card booking-row">
                  {l.cover ? <img src={l.cover} alt="" width={140} height={105} loading="lazy" /> : <span />}
                  <div>
                    <div className="row"><StatusBadge status={l.status} t={t} />{l.is_demo ? <span className="badge badge-sand">{t.demo.data}</span> : null}</div>
                    <h2 style={{ fontSize: "1.05rem", margin: "0.35rem 0 0.15rem" }}><Link href={`/${locale}/apartments/${l.slug}`}>{locale === "ar" ? l.title_ar : l.title_en}</Link></h2>
                    <div className="muted small">{locale === "ar" ? l.city_ar : l.city_en} · {money(l.base_price, locale)} · {l.host} <span dir="ltr">({l.host_email})</span> · {date(l.created_at, locale)}</div>
                    {l.review_note && <div className="xs muted">{t.host.reviewNote}: {l.review_note}</div>}
                  </div>
                  <form action={listingStatusAction} className="stack" style={{ minWidth: 220 }}>
                    <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={l.id} /><input type="hidden" name="filter" value={filter} />
                    <input className="input" name="note" placeholder={t.admin.note} maxLength={500} />
                    <div className="row">
                      {l.status !== "approved" && <SubmitButton name="status" value="approved" className="btn btn-sm">{t.admin.approve}</SubmitButton>}
                      {l.status !== "rejected" && <SubmitButton name="status" value="rejected" className="btn btn-danger btn-sm">{t.admin.reject}</SubmitButton>}
                      {l.status === "approved" && <SubmitButton name="status" value="suspended" className="btn btn-outline btn-sm">{t.admin.suspend}</SubmitButton>}
                    </div>
                  </form>
                </article>
              ))}
              {!rows.length && <EmptyState icon="home" title="—" />}
            </div>
          </>
        );
      })())}

      {tab === "bookings" && (await (async () => {
        const status = sp.status ?? "";
        const rows = await allBookings(status || undefined);
        const pays = new Map(await Promise.all(rows.map(async (b) => [b.id, await latestPayment(b.id)] as const)));
        return (
          <>
            <form method="get" className="row" style={{ marginBottom: "1rem" }}>
              <input type="hidden" name="tab" value="bookings" />
              <select className="select" name="status" defaultValue={status} style={{ maxWidth: 260 }} aria-label={t.host.status}>
                <option value="">{t.admin.all}</option>
                {["confirmed", "pending_payment", "cancelled", "expired", "payment_failed", "payment_conflict"].map((s) => <option key={s} value={s}>{(t.status as Record<string, string>)[s]}</option>)}
              </select>
              <button className="btn btn-outline btn-sm">{t.admin.filter}</button>
            </form>
            {rows.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t.booking.code}</th><th>{t.host.listing}</th><th>{t.host.guest}</th><th>{t.host.dates}</th><th>{t.host.total}</th><th>{t.host.status}</th><th>{t.booking.paidWith}</th><th>{t.host.actions}</th></tr></thead>
                  <tbody>
                    {rows.map((b) => {
                      const pay = pays.get(b.id);
                      return (
                        <tr key={b.id}>
                          <td dir="ltr" className="small"><Link href={`/${locale}/bookings/${b.code}`}>{b.code}</Link><div className="xs muted">{dateTime(b.created_at, locale)}</div></td>
                          <td className="small">{locale === "ar" ? b.title_ar : b.title_en}</td>
                          <td className="small">{b.guest_name}<div className="xs muted" dir="ltr">{b.guest_email}</div></td>
                          <td className="small">{dateRange(b.check_in, b.check_out, locale)}</td>
                          <td className="num">{money(b.total, locale)}{b.refund_amount ? <div className="xs muted">↩ {money(b.refund_amount, locale)}</div> : null}</td>
                          <td><StatusBadge status={b.status} t={t} /></td>
                          <td className="small">{pay ? <>{pay.provider} <StatusBadge status={pay.status} t={t} /></> : "—"}</td>
                          <td>
                            <div className="row">
                              {b.status === "confirmed" && b.check_out > today && (
                                <form action={adminCancelAction}>
                                  <input type="hidden" name="locale" value={locale} /><input type="hidden" name="code" value={b.code} />
                                  <SubmitButton className="btn btn-danger btn-sm" confirm={t.host.cancelBooking}>{t.host.cancelBooking}</SubmitButton>
                                </form>
                              )}
                              {pay?.status === "refund_pending" && (
                                <form action={refundAction} className="row">
                                  <input type="hidden" name="locale" value={locale} /><input type="hidden" name="paymentId" value={pay.id} />
                                  <SubmitButton name="mode" value="gateway" className="btn btn-sand btn-sm">{t.admin.refundRetry}</SubmitButton>
                                  <SubmitButton name="mode" value="manual" className="btn btn-outline btn-sm">{t.admin.refundManual}</SubmitButton>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon="calendar" title="—" />}
          </>
        );
      })())}

      {tab === "users" && (await (async () => {
        const rows = await db().prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 500").all() as { id: number; name: string; email: string; role: "guest" | "host" | "admin"; created_at: string }[];
        return (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t.auth.name}</th><th>{t.auth.email}</th><th>{t.admin.joined}</th><th>{t.admin.role}</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td dir="ltr" className="small">{u.email}</td>
                    <td className="small">{date(u.created_at, locale)}</td>
                    <td>
                      {u.id === me.id ? <span className="badge badge-mint">{t.admin.roles[u.role]}</span> : (
                        <form action={roleAction} className="row">
                          <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={u.id} />
                          <select className="select" name="role" defaultValue={u.role} style={{ minHeight: 36, width: "auto" }} aria-label={t.admin.role}>
                            {(["guest", "host", "admin"] as const).map((r) => <option key={r} value={r}>{t.admin.roles[r]}</option>)}
                          </select>
                          <SubmitButton className="btn btn-outline btn-sm">{t.admin.changeRole}</SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })())}

      {tab === "messages" && (await (async () => {
        const rows = await db().prepare("SELECT * FROM messages ORDER BY handled, created_at DESC LIMIT 200").all() as { id: number; name: string; email: string; subject: string; body: string; handled: number; created_at: string }[];
        return rows.length ? (
          <div className="stack">
            {rows.map((m) => (
              <article key={m.id} className="card card-pad" style={{ opacity: m.handled ? 0.6 : 1 }}>
                <div className="spread">
                  <strong>{m.subject}</strong>
                  <span className="muted xs">{dateTime(m.created_at, locale)}</span>
                </div>
                <div className="small muted">{m.name} · <a href={`mailto:${m.email}`} dir="ltr">{m.email}</a></div>
                <p style={{ whiteSpace: "pre-line", margin: "0.5rem 0" }}>{m.body}</p>
                {m.handled ? <span className="badge badge-ok">{t.admin.handled}</span> : (
                  <form action={messageAction}>
                    <input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={m.id} />
                    <SubmitButton className="btn btn-outline btn-sm">{t.admin.markHandled}</SubmitButton>
                  </form>
                )}
              </article>
            ))}
          </div>
        ) : <EmptyState icon="mail" title={t.admin.noMessages} />;
      })())}
    </div>
  );
}
