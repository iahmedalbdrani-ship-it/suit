import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-500.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/latin-400.css";
import "@fontsource/ibm-plex-sans-arabic/latin-500.css";
import "@fontsource/ibm-plex-sans-arabic/latin-600.css";
import "@fontsource/readex-pro/arabic-500.css";
import "@fontsource/readex-pro/arabic-600.css";
import "@fontsource/readex-pro/latin-500.css";
import "@fontsource/readex-pro/latin-600.css";
import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-700.css";
import "../globals.css";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { dirOf, getDict, isLocale, locales } from "@/lib/i18n";
import { config } from "@/lib/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#173B3B",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(isLocale(locale) ? locale : "ar");
  return {
    metadataBase: new URL(config.siteUrl),
    title: { default: t.meta.homeTitle, template: "%s | Suitly" },
    description: t.meta.homeDescription,
    applicationName: "Suitly",
    icons: { icon: "/icon.svg" },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body>
        <a href="#main" className="skip-link">{t.nav.skip}</a>
        <SiteHeader locale={locale} t={t} />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} t={t} />
      </body>
    </html>
  );
}
