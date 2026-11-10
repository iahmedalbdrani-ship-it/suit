import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "./Logo";
import { HeaderNav } from "./HeaderNav";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import type { Dict, Locale } from "@/lib/i18n";

export async function SiteHeader({ locale, t }: { locale: Locale; t: Dict }) {
  const user = await getCurrentUser();
  const items = [{ href: `/${locale}/search`, label: t.nav.search }];
  if (user?.role === "host" || user?.role === "admin") items.push({ href: `/${locale}/host`, label: t.nav.host });
  else items.push({ href: `/${locale}/become-host`, label: t.nav.becomeHost });
  if (user?.role === "admin") items.push({ href: `/${locale}/admin`, label: t.nav.admin });
  if (user) items.push({ href: `/${locale}/account`, label: t.nav.account });

  return (
    <>
      {config.demoMode && <div className="demo-bar" role="note">{t.demo.banner}</div>}
      <header className="site-header">
        <div className="container">
          <Logo href={`/${locale}`} label={`Suitly — ${t.nav.home}`} />
          <Suspense fallback={null}>
            <HeaderNav
              locale={locale}
              items={items}
              loggedIn={!!user}
              labels={{ menu: t.nav.menu, language: t.nav.language, languageLabel: t.nav.languageLabel, logout: t.nav.logout, login: t.nav.login, register: t.nav.register }}
            />
          </Suspense>
        </div>
      </header>
    </>
  );
}

export function SiteFooter({ locale, t }: { locale: Locale; t: Dict }) {
  const L = (p: string) => `/${locale}${p}`;
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo href={L("")} light label="Suitly" />
          <p className="small" style={{ marginTop: "1rem", maxWidth: "34ch" }}>{t.footer.blurb}</p>
          {config.contactEmail && <p className="small"><a href={`mailto:${config.contactEmail}`} dir="ltr">{config.contactEmail}</a></p>}
        </div>
        <div>
          <h3>{t.footer.explore}</h3>
          <ul>
            <li><Link href={L("/search")}>{t.nav.search}</Link></li>
            <li><Link href={L("/search?city=riyadh")}>{locale === "ar" ? "الرياض" : "Riyadh"}</Link></li>
            <li><Link href={L("/search?city=jeddah")}>{locale === "ar" ? "جدة" : "Jeddah"}</Link></li>
            <li><Link href={L("/search?city=abha")}>{locale === "ar" ? "أبها" : "Abha"}</Link></li>
          </ul>
        </div>
        <div>
          <h3>{t.footer.support}</h3>
          <ul>
            <li><Link href={L("/faq")}>{t.footer.faq}</Link></li>
            <li><Link href={L("/contact")}>{t.footer.contact}</Link></li>
            <li><Link href={L("/terms#cancellation")}>{t.footer.cancellation}</Link></li>
          </ul>
        </div>
        <div>
          <h3>{t.footer.company}</h3>
          <ul>
            <li><Link href={L("/about")}>{t.footer.about}</Link></li>
            <li><Link href={L("/become-host")}>{t.footer.hosts}</Link></li>
            <li><Link href={L("/privacy")}>{t.footer.privacy}</Link></li>
            <li><Link href={L("/terms")}>{t.footer.terms}</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Suitly — {t.footer.rights}</span>
        <span dir="ltr">suitly.online</span>
      </div>
    </footer>
  );
}
