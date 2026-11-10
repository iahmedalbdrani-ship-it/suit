import "server-only";
import type { Metadata } from "next";
import { config } from "./config";
import type { Locale } from "./i18n/config";

/** Per-page metadata with canonical + hreflang alternates for both languages. */
export function pageMeta(locale: Locale, path: string, title: string, description?: string, opts: { noindex?: boolean; image?: string } = {}): Metadata {
  const clean = path === "/" ? "" : path;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${clean}`,
      languages: { ar: `/ar${clean}`, en: `/en${clean}`, "x-default": `/ar${clean}` },
    },
    openGraph: {
      title,
      description,
      url: `${config.siteUrl}/${locale}${clean}`,
      siteName: "Suitly",
      locale: locale === "ar" ? "ar_SA" : "en_US",
      type: "website",
      images: opts.image ? [{ url: opts.image }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
  };
}
