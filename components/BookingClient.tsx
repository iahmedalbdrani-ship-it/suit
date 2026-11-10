"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Dict } from "@/lib/i18n/ar";
import type { Quote } from "@/lib/pricing";
import { money } from "@/lib/format";
import { PriceBreakdownClient } from "./PriceBreakdownClient";
import { Icon } from "./Icon";

type Locale = "ar" | "en";
type Ctx = {
  checkIn: string; checkOut: string; guests: number;
  setCheckIn: (v: string) => void; setCheckOut: (v: string) => void; setGuests: (n: number) => void;
  unavailable: Set<string>; loaded: boolean; today: string;
};
const BookingCtx = createContext<Ctx | null>(null);
const useBooking = () => useContext(BookingCtx)!;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function BookingProvider({ slug, today, initial, children }: {
  slug: string; today: string; initial: { checkIn?: string; checkOut?: string; guests?: number }; children: React.ReactNode;
}) {
  const [checkIn, setCheckIn] = useState(initial.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial.checkOut ?? "");
  const [guests, setGuests] = useState(initial.guests ?? 2);
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/listings/${encodeURIComponent(slug)}/availability`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && d.ok) setUnavailable(new Set(d.unavailable)); })
      .finally(() => alive && setLoaded(true));
    return () => { alive = false; };
  }, [slug]);

  // Keep the URL shareable without a navigation.
  useEffect(() => {
    const u = new URL(window.location.href);
    checkIn ? u.searchParams.set("checkIn", checkIn) : u.searchParams.delete("checkIn");
    checkOut ? u.searchParams.set("checkOut", checkOut) : u.searchParams.delete("checkOut");
    u.searchParams.set("guests", String(guests));
    window.history.replaceState(null, "", u.toString());
  }, [checkIn, checkOut, guests]);

  const value = useMemo(() => ({ checkIn, checkOut, guests, setCheckIn, setCheckOut, setGuests, unavailable, loaded, today }), [checkIn, checkOut, guests, unavailable, loaded, today]);
  return <BookingCtx.Provider value={value}>{children}</BookingCtx.Provider>;
}

/* ───────── Calendar ───────── */

export function AvailabilityCalendar({ locale, labels }: { locale: Locale; labels: Dict["listing"] }) {
  const { checkIn, checkOut, setCheckIn, setCheckOut, unavailable, today, loaded } = useBooking();
  const [offset, setOffset] = useState(0);
  const tag = locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";
  const first = useMemo(() => {
    const base = checkIn || today;
    const d = new Date(`${base.slice(0, 7)}-01T00:00:00Z`);
    return d.toISOString().slice(0, 10);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const monthAt = (k: number) => {
    const d = new Date(`${first}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + k);
    return d.toISOString().slice(0, 10);
  };

  const selectingOut = !!checkIn && !checkOut;
  const firstBlockedAfter = useMemo(() => {
    if (!checkIn) return null;
    for (let i = 0; i < 400; i++) {
      const d = addDays(checkIn, i);
      if (unavailable.has(d)) return d;
    }
    return null;
  }, [checkIn, unavailable]);

  const isDisabled = (d: string) => {
    if (!loaded || d < today) return true;
    if (selectingOut && d > checkIn) return firstBlockedAfter ? d > firstBlockedAfter : false;
    return unavailable.has(d);
  };

  const pick = (d: string) => {
    if (!checkIn || checkOut || d <= checkIn) {
      setCheckIn(d);
      setCheckOut("");
      return;
    }
    setCheckOut(d);
  };

  const dows = useMemo(() => Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(tag, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + i)))), [tag]);

  const Month = ({ start }: { start: string }) => {
    const d0 = new Date(`${start}T00:00:00Z`);
    const lead = d0.getUTCDay();
    const days = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0)).getUTCDate();
    const name = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(d0);
    return (
      <div className="cal-month">
        <h3>{name}</h3>
        <div className="cal-grid" role="grid" aria-label={name}>
          {dows.map((w, i) => <div key={i} className="dow" aria-hidden="true">{w}</div>)}
          {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const iso = addDays(start, i);
            const disabled = isDisabled(iso);
            const edge = iso === checkIn || iso === checkOut;
            const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
            const label = new Intl.DateTimeFormat(tag, { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
            return (
              <button
                key={iso}
                type="button"
                className={`cal-day${edge ? " edge" : ""}${inRange ? " in-range" : ""}${iso === today ? " today" : ""}`}
                disabled={disabled}
                aria-pressed={edge || !!inRange}
                aria-label={`${label}${disabled ? ` — ${labels.unavailable}` : ""}`}
                onClick={() => pick(iso)}
              >
                <span className="num">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const rtl = locale === "ar";
  return (
    <div>
      <div className="cal-nav">
        <button type="button" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label={labels.prevMonth}>
          <Icon name={rtl ? "chevronR" : "chevronL"} />
        </button>
        <p className="muted small" style={{ margin: 0 }}>{labels.availabilityHint}</p>
        <button type="button" onClick={() => setOffset((o) => Math.min(10, o + 1))} aria-label={labels.nextMonth}>
          <Icon name={rtl ? "chevronL" : "chevronR"} />
        </button>
      </div>
      <div className={`cal-wrap${loaded ? "" : " cal-loading"}`} aria-busy={!loaded}>
        <Month start={monthAt(offset)} />
        <Month start={monthAt(offset + 1)} />
      </div>
      <div className="spread">
        <div className="cal-legend">
          <span><i style={{ background: "var(--green)" }} />{labels.selected}</span>
          <span><i style={{ background: "#e9ecf1" }} />{labels.unavailable}</span>
        </div>
        {(checkIn || checkOut) && <button type="button" className="link-btn small" onClick={() => { setCheckIn(""); setCheckOut(""); }}>{labels.clearDates}</button>}
      </div>
    </div>
  );
}

/* ───────── Price widget ───────── */

type QuoteState = { status: "idle" } | { status: "loading" } | { status: "ok"; quote: Quote } | { status: "error"; code: string; n?: number };

export function BookingWidget({ locale, slug, basePrice, maxGuests, t, minNightsNote }: {
  locale: Locale; slug: string; basePrice: number; maxGuests: number; t: Pick<Dict, "widget" | "search" | "errors" | "checkout">; minNightsNote?: string;
}) {
  const { checkIn, checkOut, guests, setCheckIn, setCheckOut, setGuests, today } = useBooking();
  const [state, setState] = useState<QuoteState>({ status: "idle" });

  const load = useCallback(async (signal: AbortSignal) => {
    if (!checkIn || !checkOut) return setState({ status: "idle" });
    setState({ status: "loading" });
    try {
      const r = await fetch(`/api/quote?${new URLSearchParams({ slug, checkIn, checkOut, guests: String(guests) })}`, { signal, cache: "no-store" });
      const d = await r.json();
      if (d.ok) setState({ status: "ok", quote: d.quote });
      else setState({ status: "error", code: d.error.code, n: d.error.n });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setState({ status: "error", code: "generic" });
    }
  }, [checkIn, checkOut, guests, slug]);

  useEffect(() => {
    const c = new AbortController();
    const id = setTimeout(() => load(c.signal), 150);
    return () => { clearTimeout(id); c.abort(); };
  }, [load]);

  const errMsg = state.status === "error" ? ((t.errors as Record<string, string>)[state.code] ?? t.errors.generic).replace("{n}", String(state.n ?? "")) : null;
  const href = `/${locale}/book/${slug}?${new URLSearchParams({ checkIn, checkOut, guests: String(guests) })}`;

  return (
    <div className="card booking-card" id="book">
      <div className="price-line">
        {state.status === "ok" ? (
          <><strong className="num">{money(state.quote.avgNightly, locale)}</strong><span className="muted">{t.widget.perNight}</span></>
        ) : (
          <><span className="muted small">{t.widget.from}</span><strong className="num">{money(basePrice, locale)}</strong><span className="muted">{t.widget.perNight}</span></>
        )}
      </div>
      <div className="date-pair">
        <label className="field"><span>{t.search.checkIn}</span>
          <input type="date" className="input" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(""); }} />
        </label>
        <label className="field"><span>{t.search.checkOut}</span>
          <input type="date" className="input" min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
      </div>
      <label className="field" style={{ marginTop: "0.75rem" }}>
        <span>{t.search.guests}</span>
        <select className="select" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <div style={{ marginTop: "1rem" }} aria-live="polite">
        {state.status === "loading" && (
          <div className="skel-stack" role="status" aria-label={t.widget.checking}>
            {[78, 52, 60, 66].map((w, i) => <div key={i} className="skel skel-line" style={{ width: `${w}%` }} />)}
            <div className="skel" style={{ height: 22, marginTop: 6 }} />
          </div>
        )}
        {errMsg && <p className="alert alert-error small" role="alert">{errMsg}</p>}
        {state.status === "ok" && <PriceBreakdownClient q={state.quote} locale={locale} t={t.widget} />}
      </div>

      {state.status === "ok" ? (
        <a href={href} className="btn btn-block btn-lg" style={{ marginTop: "1rem" }}>{t.widget.reserve}</a>
      ) : (
        <a href="#availability" className="btn btn-block btn-lg btn-outline" style={{ marginTop: "1rem" }}>{t.widget.chooseDates}</a>
      )}
      <p className="muted xs center" style={{ marginTop: "0.6rem", marginBottom: 0 }}>{t.widget.noCharge}</p>
      {minNightsNote && <p className="muted xs center" style={{ margin: 0 }}>{minNightsNote}</p>}
    </div>
  );
}

export function MobileBookBar({ locale, basePrice, perNight, cta, choose }: { locale: Locale; basePrice: number; perNight: string; cta: string; choose: string }) {
  const { checkIn, checkOut } = useBooking();
  return (
    <div className="mobile-book-bar">
      <div><strong className="num" style={{ fontFamily: "var(--font-head)", color: "var(--green)" }}>{money(basePrice, locale)}</strong> <span className="muted small">{perNight}</span></div>
      <a href="#book" className="btn">{checkIn && checkOut ? cta : choose}</a>
    </div>
  );
}
