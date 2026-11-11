"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, safeNext } from "@/lib/auth";
import { normalizeSaPhone } from "@/lib/phone";
import { captchaOk, discardChallenge, getChallenge, issueOtp, verifyOtp, OTP_TTL_MS } from "@/lib/otp";
import { clientIp, loc, qs, s } from "./_util";

const CHALLENGE_COOKIE = "suitly_otp";

async function setChallenge(id: string) {
  (await cookies()).set(CHALLENGE_COOKIE, id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.floor(OTP_TTL_MS / 1000) * 2,
  });
}
const readChallenge = async () => (await cookies()).get(CHALLENGE_COOKIE)?.value;

/** Step 1: phone number only. */
export async function requestOtpAction(fd: FormData) {
  const locale = loc(fd);
  const next = safeNext(s(fd, "next", 500), `/${locale}/account`);
  const back = (error: string, extra: Record<string, string | number | undefined> = {}) => redirect(`/${locale}/phone${qs({ error, next, ...extra })}`);
  const ip = await clientIp();

  if (s(fd, "website", 100)) back("otp_rate_limited"); // honeypot: real users never fill this
  if (!(await captchaOk(s(fd, "cf-turnstile-response", 4000), ip))) back("captcha_failed");
  const phone = normalizeSaPhone(s(fd, "phone", 40));
  if (!phone) back("phone_invalid");

  const sent = await issueOtp(phone!, ip);
  if (!sent.ok) back(sent.error, { wait: sent.retryAfter });
  await setChallenge((sent as { ok: true; challengeId: string }).challengeId);
  redirect(`/${locale}/phone${qs({ next })}`);
}

/** Step 2 → resend a fresh code for the same number (60 s cooldown enforced on the server). */
export async function resendOtpAction(fd: FormData) {
  const locale = loc(fd);
  const next = safeNext(s(fd, "next", 500), `/${locale}/account`);
  const back = (error: string, extra: Record<string, string | number | undefined> = {}) => redirect(`/${locale}/phone${qs({ error, next, ...extra })}`);
  const id = await readChallenge();
  const ch = await getChallenge(id);
  if (!ch) back("otp_expired");
  const sent = await issueOtp(ch!.phone, await clientIp(), id);
  if (!sent.ok) {
    if (sent.error === "otp_cooldown") redirect(`/${locale}/phone${qs({ next, error: "otp_cooldown" })}`);
    back(sent.error);
  }
  await setChallenge((sent as { ok: true; challengeId: string }).challengeId);
  redirect(`/${locale}/phone${qs({ next, resent: 1 })}`);
}

/** Step 2 → go back and type a different number. */
export async function changePhoneAction(fd: FormData) {
  const locale = loc(fd);
  const next = safeNext(s(fd, "next", 500), `/${locale}/account`);
  await discardChallenge(await readChallenge());
  (await cookies()).delete(CHALLENGE_COOKIE);
  redirect(`/${locale}/phone${qs({ next })}`);
}

/** Step 2: verify the code, sign in (creating the account if the number is new), return to where the user came from. */
export async function verifyOtpAction(fd: FormData) {
  const locale = loc(fd);
  const next = safeNext(s(fd, "next", 500), `/${locale}/account`);
  const result = await verifyOtp(await readChallenge(), s(fd, "code", 40), await clientIp());
  if (!result.ok) redirect(`/${locale}/phone${qs({ error: result.error, next })}`);
  (await cookies()).delete(CHALLENGE_COOKIE);
  await createSession((result as { ok: true; userId: number }).userId);
  redirect(next);
}
