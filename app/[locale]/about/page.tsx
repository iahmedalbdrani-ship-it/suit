import Link from "next/link";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { about } from "@/lib/content";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/about", getDict(locale).pages.aboutTitle, about[locale].lead);
}

export default async function About({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  const t = getDict(locale);
  const c = about[locale];
  return (
    <>
      <div className="page-hero"><div className="narrow"><h1>{t.pages.aboutTitle}</h1></div></div>
      <div className="narrow prose section">
        <p style={{ fontSize: "1.15rem", color: "var(--ink)" }}>{c.lead}</p>
        {c.sections.map((s) => <section key={s.h}><h2>{s.h}</h2><p>{s.p}</p></section>)}
        <div className="row" style={{ marginTop: "2rem" }}>
          <Link className="btn" href={`/${locale}/search`}>{t.nav.search}</Link>
          <Link className="btn btn-outline" href={`/${locale}/contact`}>{t.footer.contact}</Link>
        </div>
      </div>
    </>
  );
}
