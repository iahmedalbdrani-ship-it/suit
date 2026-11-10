import Link from "next/link";
import type { Metadata } from "next";
import { getDict, resolveLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { pageMeta } from "@/lib/seo";
import { becomeHostAction } from "@/app/actions/account";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDict(locale);
  return pageMeta(locale, "/become-host", t.home.hostTitle, t.home.hostText);
}

export default async function BecomeHost({ params }: Props) {
  const locale = resolveLocale((await params).locale);
  const t = getDict(locale);
  const user = await getCurrentUser();
  const isHost = user && (user.role === "host" || user.role === "admin");
  const cta = isHost ? `/${locale}/host/listings/new` : `/${locale}/register?host=1&next=${encodeURIComponent(`/${locale}/host/listings/new`)}`;
  const steps = locale === "ar"
    ? [["home", "أضف شقتك", "اكتب الوصف والمرافق وارفع الصور بالعربية والإنجليزية."], ["tag", "حدد أسعارك", "سعر الليلة، وسعر نهاية الأسبوع، ورسوم التنظيف، والخصومات، والأيام المغلقة."], ["shield", "نراجع وننشر", "يراجع فريق Suitly الإعلان ثم يظهر للضيوف."], ["calendar", "تابع حجوزاتك", "كل الحجوزات والإيرادات في لوحة واحدة."]]
    : [["home", "Add your place", "Write the description and amenities and upload photos, in Arabic and English."], ["tag", "Set your prices", "Nightly and weekend rates, cleaning fee, discounts and blocked days."], ["shield", "We review & publish", "The Suitly team reviews the listing, then it goes live."], ["calendar", "Track bookings", "All bookings and revenue in one dashboard."]];
  return (
    <>
      <section className="hero">
        <div className="container" style={{ paddingBlock: "3.5rem" }}>
          <span className="kicker">{t.footer.hosts}</span>
          <h1>{t.home.hostTitle}</h1>
          <p className="lead">{t.home.hostText}</p>
          {user && !isHost ? (
            <form action={becomeHostAction} style={{ marginTop: "1rem" }}>
              <input type="hidden" name="locale" value={locale} />
              <button className="btn btn-sand btn-lg" type="submit">{t.home.hostCta}</button>
            </form>
          ) : (
            <Link href={cta} className="btn btn-sand btn-lg" style={{ marginTop: "1rem" }}>{isHost ? t.host.addListing : t.home.hostCta}</Link>
          )}
        </div>
      </section>
      <section className="section container">
        <div className="bento">
          {steps.map(([icon, h, p], i) => (
            <article className={`tile${i === 0 ? " wide sand" : i === 3 ? " wide" : ""}`} key={h}>
              <div className="ico"><Icon name={icon} size={22} /></div>
              <div><span className="step-n">0{i + 1}</span><h3 style={{ marginTop: ".4rem" }}>{h}</h3><p>{p}</p></div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
