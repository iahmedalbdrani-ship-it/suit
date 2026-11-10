import Link from "next/link";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { getCities } from "@/lib/data/listings";
import { ListingForm } from "@/components/ListingForm";
import { Alert, errorText } from "@/components/ui";
import { pageMeta } from "@/lib/seo";
import { Chevron } from "@/components/Icon";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/host/listings/new", getDict(locale).host.addListing, undefined, { noindex: true });
}

export default async function NewListing({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  await requireRole(locale, ["host", "admin"], `/${locale}/host/listings/new`);
  return (
    <div className="container" style={{ paddingBottom: "3rem", maxWidth: 980 }}>
      <div className="dash-head">
        <Link href={`/${locale}/host?tab=listings`} className="small row" style={{ gap: "0.25rem" }}><Chevron dir="back" rtl={locale === "ar"} size={16} />{t.host.listings}</Link>
        <h1 style={{ fontSize: "1.8rem", margin: "0.5rem 0 0" }}>{t.host.addListing}</h1>
        <p className="muted">{t.host.pendingNote}</p>
      </div>
      {sp.error && <div style={{ marginBottom: "1rem" }}><Alert kind="error">{errorText(t, sp.error)}</Alert></div>}
      <ListingForm locale={locale} t={t} cities={await getCities()} />
    </div>
  );
}
