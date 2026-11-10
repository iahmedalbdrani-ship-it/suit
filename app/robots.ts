import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/api/", "/*/account", "/*/host", "/*/admin", "/*/book/", "/*/pay/", "/*/bookings/", "/*/login", "/*/register"];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: privatePaths }],
    sitemap: `${config.siteUrl}/sitemap.xml`,
    host: config.siteUrl,
  };
}
