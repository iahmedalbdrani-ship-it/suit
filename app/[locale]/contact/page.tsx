import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { contactAction } from "@/app/actions/account";
import { Alert, errorText } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { pageMeta } from "@/lib/seo";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDict(locale);
  return pageMeta(locale, "/contact", t.pages.contactTitle, t.pages.contactText);
}

export default async function Contact({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDict(locale);
  const user = await getCurrentUser();
  const wa = config.contactWhatsapp.replace(/[^\d]/g, "");
  return (
    <>
      <div className="page-hero"><div className="narrow"><h1>{t.pages.contactTitle}</h1><p className="muted" style={{ margin: 0 }}>{t.pages.contactText}</p></div></div>
      <div className="narrow section stack">
        {sp.ok && <Alert kind="ok">{t.pages.contactSent}</Alert>}
        {sp.error && <Alert kind="error">{errorText(t, sp.error)}</Alert>}
        <form action={contactAction} className="card card-pad stack">
          <input type="hidden" name="locale" value={locale} />
          <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
          <div className="grid-2">
            <label className="field"><span>{t.pages.contactName}</span><input className="input" name="name" required maxLength={80} defaultValue={user?.name} autoComplete="name" /></label>
            <label className="field"><span>{t.pages.contactEmail}</span><input className="input" name="email" type="email" required dir="ltr" defaultValue={user?.email} autoComplete="email" /></label>
          </div>
          <label className="field"><span>{t.pages.contactSubject}</span><input className="input" name="subject" maxLength={150} /></label>
          <label className="field"><span>{t.pages.contactMessage}</span><textarea className="textarea" name="message" required maxLength={4000} rows={6} /></label>
          <div><SubmitButton>{t.pages.contactSend}</SubmitButton></div>
        </form>
        {(config.contactEmail || wa) && (
          <div className="card card-pad">
            <strong>{t.pages.contactDirect}</strong>
            <div className="row" style={{ marginTop: "0.75rem" }}>
              {config.contactEmail && <a className="btn btn-outline" href={`mailto:${config.contactEmail}`}><Icon name="mail" size={18} /><span dir="ltr">{config.contactEmail}</span></a>}
              {wa && <a className="btn btn-mint" href={`https://wa.me/${wa}`} target="_blank" rel="noopener"><Icon name="phone" size={18} />WhatsApp</a>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
