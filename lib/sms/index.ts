import "server-only";
import { config } from "../config";

export type SmsResult = { ok: true } | { ok: false; reason: "unavailable" | "failed" };

const isLocalSite = () => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(config.siteUrl);

export function smsConfigured(): boolean {
  if (!config.otpSecret && !(config.smsProvider === "mock" && isLocalSite())) return false;
  if (config.smsProvider === "twilio") {
    return !!(config.twilioSid && config.twilioToken && (config.twilioFrom || config.twilioMessagingService));
  }
  if (config.smsProvider === "mock") return isLocalSite();
  return false;
}

/** Secret used to hash codes. Required in production; the mock provider (localhost only) may fall back to a fixed dev value. */
export function otpSecret(): string {
  return config.otpSecret || (config.smsProvider === "mock" && isLocalSite() ? "local-dev-otp-secret" : "");
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!smsConfigured()) return { ok: false, reason: "unavailable" };
  if (config.smsProvider === "mock") return { ok: true }; // local dev only: nothing is sent and nothing is logged
  try {
    const params = new URLSearchParams({ To: to, Body: body });
    if (config.twilioMessagingService) params.set("MessagingServiceSid", config.twilioMessagingService);
    else params.set("From", config.twilioFrom);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.twilioSid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${config.twilioSid}:${config.twilioToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
