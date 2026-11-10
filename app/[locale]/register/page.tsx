import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { registerAction } from "@/app/actions/auth";
import { Alert, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { LogoMark } from "@/components/Logo";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/register", getDict(locale).auth.registerTitle, undefined, { noindex: true });
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const next = sp.next ? safeNext(sp.next, "") : "";
  if (await getCurrentUser()) redirect(next || `/${locale}/account`);

  return (
    <div className="container auth-wrap">
      <div className="card card-pad auth-card stack">
        <LogoMark size={44} />
        <div>
          <h1 style={{ fontSize: "1.6rem", margin: 0 }}>{t.auth.registerTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>{t.auth.registerText}</p>
        </div>
        {sp.error && <Alert kind="error">{errorText(t, sp.error)}</Alert>}
        <form action={registerAction} className="stack">
          <input type="hidden" name="locale" value={locale} />
          {next && <input type="hidden" name="next" value={next} />}
          <label className="field"><span>{t.auth.name}</span>
            <input className="input" name="name" required maxLength={80} autoComplete="name" defaultValue={sp.name ?? ""} />
          </label>
          <label className="field"><span>{t.auth.email}</span>
            <input className="input" type="email" name="email" required autoComplete="email" dir="ltr" defaultValue={sp.email ?? ""} />
          </label>
          <label className="field"><span>{t.auth.phone}</span>
            <input className="input" type="tel" name="phone" autoComplete="tel" dir="ltr" inputMode="tel" placeholder="05xxxxxxxx" />
          </label>
          <label className="field"><span>{t.auth.password}</span>
            <input className="input" type="password" name="password" required minLength={8} autoComplete="new-password" dir="ltr" aria-describedby="pw-hint" />
            <span className="hint" id="pw-hint">{t.auth.passwordHint}</span>
          </label>
          <label className="check">
            <input type="checkbox" name="asHost" defaultChecked={sp.host === "1"} />
            <span>{t.auth.asHost}</span>
          </label>
          <SubmitButton className="btn btn-lg btn-block">{t.auth.submitRegister}</SubmitButton>
        </form>
        <p className="center small" style={{ margin: 0 }}>
          {t.auth.haveAccount} <Link href={`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{t.nav.login}</Link>
        </p>
      </div>
    </div>
  );
}
