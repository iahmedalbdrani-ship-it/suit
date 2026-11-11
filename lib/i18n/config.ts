export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Intl locale tags: Gregorian calendar + Latin digits for clarity in prices and dates. */
export function intlTag(locale: Locale): string {
  return locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

const arPlural = new Intl.PluralRules("ar");

/**
 * Replace {name} placeholders. Also supports Arabic plural forms:
 * "{n?zero=..;one=..;two=..;few=..;many=..;other=..}" where "#" is replaced by the number.
 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template
    .replace(/\{(\w+)\?([^}]*)\}/g, (_, k, body: string) => {
      const n = Number(vars[k]);
      const forms: Record<string, string> = {};
      for (const part of body.split(";")) {
        const i = part.indexOf("=");
        if (i > 0) forms[part.slice(0, i).trim()] = part.slice(i + 1);
      }
      const cat = n === 0 && forms.zero ? "zero" : arPlural.select(n);
      return (forms[cat] ?? forms.other ?? "").replace(/#/g, String(vars[k]));
    })
    .replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
