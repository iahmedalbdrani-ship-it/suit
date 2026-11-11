import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { loginAction } from "@/app/actions/auth";
import { Alert, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { LogoMark } from "@/components/Logo";
import { config, DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/config";
import { pageMeta } from "@/lib/seo";
import { smsConfigured } from "@/lib/sms";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/login", getDict(locale).auth.loginTitle, undefined, { noindex: true });
}

export default async function LoginPage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const next = safeNext(sp.next, `/${locale}/account`);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="container auth-wrap">
      <div className="card card-pad auth-card stack">
        <LogoMark size={44} />
        <div>
          <h1 style={{ fontSize: "1.6rem", margin: 0 }}>{t.auth.loginTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>{t.auth.loginText}</p>
        </div>
        {sp.error && <Alert kind="error">{errorText(t, sp.error)}</Alert>}
        {smsConfigured() && (
          <>
            <Link className="btn btn-lg btn-block" href={`/${locale}/phone?next=${encodeURIComponent(next)}`}>{t.phone.useMobile}</Link>
            <div className="auth-divider" aria-hidden="true">{t.phone.or}</div>
          </>
        )}
        <form action={loginAction} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={next} />
          <label className="field"><span>{t.auth.email}</span>
            <input className="input" type="email" name="email" required autoComplete="email" dir="ltr" defaultValue={sp.email ?? ""} />
          </label>
          <label className="field"><span>{t.auth.password}</span>
            <input className="input" type="password" name="password" required autoComplete="current-password" dir="ltr" />
          </label>
          <SubmitButton className="btn btn-lg btn-block">{t.auth.submitLogin}</SubmitButton>
        </form>
        <p className="center small" style={{ margin: 0 }}>
          {t.auth.noAccount} <Link href={`/${locale}/register?next=${encodeURIComponent(next)}`}>{t.nav.register}</Link>
        </p>
        {config.demoMode && (
          <div className="demo-accounts">
            <strong>{t.auth.demoAccounts}</strong> — <code>{DEMO_PASSWORD}</code>
            <ul>
              <li>{t.auth.demoGuest}: <code>{DEMO_ACCOUNTS.guest}</code></li>
              <li>{t.auth.demoHost}: <code>{DEMO_ACCOUNTS.host}</code></li>
              <li>{t.auth.demoAdmin}: <code>{DEMO_ACCOUNTS.admin}</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
