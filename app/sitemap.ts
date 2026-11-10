import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.siteUrl;
  const pages = ["", "/search", "/about", "/faq", "/contact", "/privacy", "/terms", "/become-host"];
  const cities = await db().prepare("SELECT slug FROM cities").all<{ slug: string }>();
  const listings = await db().prepare("SELECT slug, updated_at FROM listings WHERE status = 'approved'").all<{ slug: string; updated_at: string }>();
  const entry = (path: string, lastModified?: string, priority = 0.6): MetadataRoute.Sitemap[number] => ({
    url: `${base}/ar${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    priority,
    alternates: { languages: { ar: `${base}/ar${path}`, en: `${base}/en${path}` } },
  });
  return [
    ...pages.map((p) => entry(p, undefined, p === "" ? 1 : 0.6)),
    ...cities.map((c) => entry(`/search?city=${c.slug}`, undefined, 0.7)),
    ...listings.map((l) => entry(`/apartments/${l.slug}`, l.updated_at, 0.8)),
  ];
}
