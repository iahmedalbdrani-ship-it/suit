import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { faq } from "@/lib/content";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/faq", getDict(locale).pages.faqTitle, faq[locale][0].a);
}

export default async function Faq({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  const t = getDict(locale);
  const items = faq[locale];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="page-hero"><div className="narrow"><h1>{t.pages.faqTitle}</h1></div></div>
      <div className="narrow section faq">
        {items.map((i, k) => (
          <details key={i.q} open={k === 0}>
            <summary>{i.q}</summary>
            <p>{i.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
