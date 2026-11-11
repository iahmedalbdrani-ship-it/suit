import "server-only";

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const env = (k: string) => process.env[k];

/** Getters, not constants: on Cloudflare Workers env vars are only populated per request, not at module load. */
export const config = {
  get siteUrl() { return (env("SITE_URL") || "http://localhost:3000").replace(/\/$/, ""); },
  /** NEXT_PUBLIC_DEMO_MODE controls the demo banner and "demo data" tags; falls back to DEMO_MODE. "false" = production. */
  get demoMode() { return (env("NEXT_PUBLIC_DEMO_MODE") ?? env("DEMO_MODE")) !== "false"; },
  get seedDemoData() { return env("SEED_DEMO_DATA") !== "false"; },
  get databasePath() { return env("DATABASE_PATH") || "./data/suitly.db"; },
  get uploadsDir() { return env("UPLOADS_DIR") || "./data/uploads"; },
  get serviceFeeRate() { return num(env("SERVICE_FEE_RATE"), 0); },
  get vatRate() { return num(env("VAT_RATE"), 0); },
  get holdMinutes() { return num(env("BOOKING_HOLD_MINUTES"), 15); },
  get paymentProvider() { return (env("PAYMENT_PROVIDER") || "demo") as "demo" | "moyasar"; },
  get moyasarSecretKey() { return env("MOYASAR_SECRET_KEY") || ""; },
  get moyasarWebhookSecret() { return env("MOYASAR_WEBHOOK_SECRET") || ""; },
  get adminEmail() { return env("ADMIN_EMAIL") || ""; },
  get adminPassword() { return env("ADMIN_PASSWORD") || ""; },
  get contactEmail() { return env("CONTACT_EMAIL") || ""; },
  get contactWhatsapp() { return env("CONTACT_WHATSAPP") || ""; },
  /** Phone sign-in. SMS_PROVIDER: "twilio" (production) or "mock" (local only, refused unless SITE_URL is localhost). */
  get smsProvider() { return (env("SMS_PROVIDER") || "") as "" | "twilio" | "mock"; },
  get twilioSid() { return env("TWILIO_ACCOUNT_SID") || ""; },
  get twilioToken() { return env("TWILIO_AUTH_TOKEN") || ""; },
  get twilioFrom() { return env("TWILIO_FROM") || ""; },
  get twilioMessagingService() { return env("TWILIO_MESSAGING_SERVICE_SID") || ""; },
  get otpSecret() { return env("OTP_SECRET") || ""; },
  get otpGlobalHourlyLimit() { return num(env("OTP_GLOBAL_HOURLY_LIMIT"), 300); },
  get turnstileSiteKey() { return env("TURNSTILE_SITE_KEY") || ""; },
  get turnstileSecret() { return env("TURNSTILE_SECRET_KEY") || ""; },
  timeZone: "Asia/Riyadh",
  currency: "SAR",
};

export const DEMO_PASSWORD = "Demo@1234";
export const DEMO_ACCOUNTS = {
  guest: "guest@suitly.online",
  host: "host@suitly.online",
  admin: "admin@suitly.online",
};
