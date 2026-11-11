/** Saudi mobile numbers only (+9665XXXXXXXX). Accepts the common ways people type them. */
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toLatinDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const a = ARABIC_DIGITS.indexOf(d);
    return String(a >= 0 ? a : PERSIAN_DIGITS.indexOf(d));
  });
}

/** 0501234567 | 501234567 | 966501234567 | +966 50 123 4567 | 00966501234567 | 05 0123 4567 → +966501234567, else null. */
export function normalizeSaPhone(input: string): string | null {
  let d = toLatinDigits(input).replace(/[\s\-().‎‏‪-‮]/g, "");
  if (!/^\+?\d+$/.test(d)) return null;
  d = d.replace(/^\+/, "");
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? `+966${d}` : null;
}

/** +966 5X XXX X123 — enough for the user to recognise their number, nothing more. */
export function maskPhone(e164: string): string {
  const d = e164.replace(/^\+966/, "");
  return `+966 ${d.slice(0, 1)}X XXX X${d.slice(-3)}`;
}

/** Accounts created through phone sign-in get a placeholder e-mail that can never receive mail. */
export const PHONE_EMAIL_DOMAIN = "phone.suitly.invalid";
export const isPhoneAccountEmail = (email: string) => email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);
export const phoneAccountEmail = (e164: string) => `${e164.replace("+", "")}@${PHONE_EMAIL_DOMAIN}`;
export const PHONE_GUEST_NAME = "ضيف Suitly";

/** Normalise a typed code: Arabic digits → Latin, drop spaces/dashes. */
export function normalizeCode(input: string): string {
  return toLatinDigits(input).replace(/\D/g, "");
}
