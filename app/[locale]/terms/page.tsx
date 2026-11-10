import type { Metadata } from "next";
import { getDict, fmt, resolveLocale } from "@/lib/i18n";
import { terms } from "@/lib/content";
import { pageMeta } from "@/lib/seo";
import { config } from "@/lib/config";
import { date } from "@/lib/format";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/terms", getDict(locale).pages.termsTitle);
}

export default async function Terms({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  const t = getDict(locale);
  return (
    <>
      <div className="page-hero"><div className="narrow"><h1>{t.pages.termsTitle}</h1><p className="muted" style={{ margin: 0 }}>{fmt(t.pages.lastUpdated, { date: date("2026-11-10", locale) })}</p></div></div>
      <div className="narrow prose section">
        {config.demoMode && <p className="alert alert-warn">{t.demo.legalDraft}</p>}
        {terms[locale].map((s) => <section key={s.h} id={s.id}><h2>{s.h}</h2><ul>{s.p.map((x) => <li key={x}>{x}</li>)}</ul></section>)}
      </div>
    </>
  );
}
