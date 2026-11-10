import { z } from "zod";
import { isIsoDate } from "./dates";

/** Shared input schemas — every public boundary (API routes, server actions) parses through these. */

export const isoDate = z.string().trim().refine(isIsoDate, { message: "invalid_dates" });
export const slug = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "not_found");
export const guests = z.coerce.number().int().min(1).max(30);

export const quoteQuery = z.object({
  slug,
  checkIn: isoDate,
  checkOut: isoDate,
  guests: guests.default(1),
});

export const bookingForm = z.object({
  slug,
  checkIn: isoDate,
  checkOut: isoDate,
  guests,
  name: z.string().trim().min(2, "required").max(80),
  phone: z.string().trim().transform((v) => v.replace(/[^\d+]/g, "")).pipe(z.string().min(9, "required").max(16)),
  notes: z.string().trim().max(500).optional().default(""),
  agree: z.literal("on", { message: "terms_required" }),
});

export const paymentId = z.string().regex(/^pay_[a-f0-9]{24}$/);
export const bookingCode = z.string().regex(/^SU-[A-Z0-9]{4,10}$/);

/** First issue's message is used as our i18n error code. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message && /^[a-z_]+$/.test(err.issues[0].message) ? err.issues[0].message : "invalid_dates";
}
