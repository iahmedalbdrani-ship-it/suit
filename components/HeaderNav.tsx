"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { logoutAction } from "@/app/actions/auth";

type Item = { href: string; label: string };

export function HeaderNav({
  locale, items, loggedIn, labels,
}: {
  locale: "ar" | "en";
  items: Item[];
  loggedIn: boolean;
  labels: { menu: string; language: string; languageLabel: string; logout: string; login: string; register: string };
}) {
  const pathname = usePathname() || `/${locale}`;
  const search = useSearchParams();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const other = locale === "ar" ? "en" : "ar";
  const switched = pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`) + (search?.toString() ? `?${search.toString()}` : "");

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  const isCurrent = (href: string) => (href === `/${locale}` ? pathname === href : pathname.startsWith(href));
  const setLang = () => { document.cookie = `suitly_lang=${other};path=/;max-age=31536000;samesite=lax`; };

  const links = (
    <>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={isCurrent(i.href) ? "page" : undefined}>{i.label}</Link>
      ))}
    </>
  );

  return (
    <>
      <nav className="nav" aria-label={labels.menu}>
        {links}
        {loggedIn ? (
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button className="btn btn-ghost btn-sm" type="submit"><Icon name="logout" size={16} />{labels.logout}</button>
          </form>
        ) : (
          <>
            <Link href={`/${locale}/login`}>{labels.login}</Link>
            <Link href={`/${locale}/register`} className="btn btn-sm">{labels.register}</Link>
          </>
        )}
        <a href={switched} hrefLang={other} lang={other} className="lang-switch" aria-label={labels.languageLabel} onClick={setLang}>{labels.language}</a>
      </nav>

      <details className="menu-toggle" ref={menuRef}>
        <summary aria-label={labels.menu}><Icon name="menu" /></summary>
        <div className="mobile-menu">
          {links}
          {loggedIn ? (
            <form action={logoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit">{labels.logout}</button>
            </form>
          ) : (
            <>
              <Link href={`/${locale}/login`}>{labels.login}</Link>
              <Link href={`/${locale}/register`}>{labels.register}</Link>
            </>
          )}
          <a href={switched} hrefLang={other} lang={other} onClick={setLang}><Icon name="globe" size={16} className="inline" /> {labels.language}</a>
        </div>
      </details>
    </>
  );
}
