import type { Quote } from "@/lib/pricing";
import type { Dict } from "@/lib/i18n/ar";
import { money } from "@/lib/format";

const f = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/** Same breakdown as the server version, usable inside client components. */
export function PriceBreakdownClient({ q, locale, t }: { q: Quote; locale: "ar" | "en"; t: Dict["widget"] }) {
  return (
    <dl className="breakdown">
      <div><dt>{f(t.nightsX, { price: money(q.avgNightly, locale), n: q.nights })}</dt><dd className="num">{money(q.nightsTotal, locale)}</dd></div>
      {q.discount > 0 && <div className="discount"><dt>{t.discount} ({q.discountPercent}%)</dt><dd className="num">−{money(q.discount, locale)}</dd></div>}
      {q.cleaningFee > 0 && <div><dt>{t.cleaning}</dt><dd className="num">{money(q.cleaningFee, locale)}</dd></div>}
      {q.serviceFee > 0 && <div><dt>{t.service}</dt><dd className="num">{money(q.serviceFee, locale)}</dd></div>}
      {q.vat > 0 && <div><dt>{f(t.vat, { rate: Math.round(q.vatRate * 100) })}</dt><dd className="num">{money(q.vat, locale)}</dd></div>}
      <div className="total"><dt>{t.total}</dt><dd className="num">{money(q.total, locale)}</dd></div>
    </dl>
  );
}
