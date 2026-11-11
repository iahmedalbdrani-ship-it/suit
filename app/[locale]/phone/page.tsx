import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { Alert, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { OtpForm } from "@/components/OtpForm";
import { LogoMark } from "@/components/Logo";
import { config } from "@/lib/config";
import { smsConfigured } from "@/lib/sms";
import { getChallenge } from "@/lib/otp";
import { maskPhone } from "@/lib/phone";
import { changePhoneAction, requestOtpAction, resendOtpAction, verifyOtpAction } from "@/app/actions/phone";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMeta(locale, "/phone", getDict(locale).phone.title, undefined, { noindex: true });
}

export default async function PhonePage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const p = t.phone;
  const next = safeNext(sp.next, `/${locale}/account`);
  if (await getCurrentUser()) redirect(next);

  const enabled = smsConfigured();
  const challenge = enabled ? await getChallenge((await cookies()).get("suitly_otp")?.value) : null;
  const captcha = !!(config.turnstileSiteKey && config.turnstileSecret);
  const err = errorText(t, sp.error, sp.wait);
  const emailHref = `/${locale}/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="container auth-wrap">
      <div className="card card-pad auth-card stack">
        <LogoMark size={44} />
        {!enabled ? (
          <>
            <h1 style={{ fontSize: "1.6rem", margin: 0 }}>{p.unavailableTitle}</h1>
            <Alert kind="error">{p.unavailableText}</Alert>
            <Link className="btn btn-block" href={emailHref}>{p.useEmail}</Link>
          </>
        ) : challenge ? (
          <>
            <div>
              <h1 style={{ fontSize: "1.6rem", margin: 0 }}>{p.codeTitle}</h1>
              <p className="muted" style={{ margin: 0 }}>
                {p.codeText} <bdi dir="ltr" className="num">{maskPhone(challenge.phone)}</bdi>
              </p>
            </div>
            {err && <Alert kind="error">{err}</Alert>}
            {sp.resent && !err && <Alert kind="info">{p.resent}</Alert>}
            <OtpForm
              locale={locale} next={next} resendAt={challenge.resendAt}
              verifyAction={verifyOtpAction} resendAction={resendOtpAction} changeAction={changePhoneAction}
              t={{ codeLabel: p.codeLabel, verify: p.verify, verifying: p.verifying, resend: p.resend, resendIn: p.resendIn, change: p.change }}
            />
            <p className="muted small" style={{ margin: 0 }}>{p.codeHelp}</p>
          </>
        ) : (
          <>
            <div>
              <h1 style={{ fontSize: "1.6rem", margin: 0 }}>{p.title}</h1>
              <p className="muted" style={{ margin: 0 }}>{p.text}</p>
            </div>
            {err && <Alert kind="error">{err}</Alert>}
            <form action={requestOtpAction} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="next" value={next} />
              <label className="field"><span>{p.phoneLabel}</span>
                <div className="phone-field" dir="ltr">
                  <span className="phone-cc" aria-hidden="true">+966</span>
                  <input
                    className="input" type="tel" name="phone" inputMode="tel" autoComplete="tel-national" required
                    placeholder="5X XXX XXXX" maxLength={24} aria-describedby="phone-hint" autoFocus
                  />
                </div>
                <small id="phone-hint" className="muted">{p.phoneHint}</small>
              </label>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp-field" />
              {captcha && (
                <>
                  <div className="cf-turnstile" data-sitekey={config.turnstileSiteKey} data-language={locale} />
                  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                </>
              )}
              <SubmitButton className="btn btn-lg btn-block" pending={p.sending}>{p.send}</SubmitButton>
            </form>
            <p className="muted small" style={{ margin: 0 }}>
              {p.consentA} <Link href={`/${locale}/terms`} target="_blank">{t.footer.terms}</Link> {p.consentB} <Link href={`/${locale}/privacy`} target="_blank">{t.footer.privacy}</Link>.
            </p>
            <p className="center small" style={{ margin: 0 }}>
              <Link href={emailHref}>{p.useEmail}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
