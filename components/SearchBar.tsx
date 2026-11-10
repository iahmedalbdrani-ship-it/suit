"use client";

import { useState } from "react";
import { Icon } from "./Icon";

type City = { slug: string; name: string };

function plusDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function SearchBar({
  locale, cities, today, labels, initial = {}, compact = false,
}: {
  locale: string;
  cities: City[];
  today: string;
  labels: { where: string; anyCity: string; checkIn: string; checkOut: string; guests: string; submit: string; title: string };
  initial?: { city?: string; checkIn?: string; checkOut?: string; guests?: number };
  compact?: boolean;
}) {
  const [checkIn, setCheckIn] = useState(initial.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial.checkOut ?? "");

  const onCheckIn = (v: string) => {
    setCheckIn(v);
    if (v && (!checkOut || checkOut <= v)) setCheckOut(plusDays(v, 1));
  };

  return (
    <form action={`/${locale}/search`} method="get" role="search" aria-label={labels.title} className={`searchbar${compact ? " compact" : ""}`}>
      <div className="sb-field">
        <label htmlFor="sb-city">{labels.where}</label>
        <select id="sb-city" name="city" className="select" defaultValue={initial.city ?? ""}>
          <option value="">{labels.anyCity}</option>
          {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <div className="sb-field">
        <label htmlFor="sb-in">{labels.checkIn}</label>
        <input id="sb-in" type="date" name="checkIn" className="input" min={today} value={checkIn} onChange={(e) => onCheckIn(e.target.value)} />
      </div>
      <div className="sb-field">
        <label htmlFor="sb-out">{labels.checkOut}</label>
        <input id="sb-out" type="date" name="checkOut" className="input" min={checkIn ? plusDays(checkIn, 1) : plusDays(today, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </div>
      <div className="sb-field">
        <label htmlFor="sb-guests">{labels.guests}</label>
        <select id="sb-guests" name="guests" className="select" defaultValue={String(initial.guests ?? 2)}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <button type="submit" className="btn btn-lg"><Icon name="search" size={18} />{labels.submit}</button>
    </form>
  );
}
