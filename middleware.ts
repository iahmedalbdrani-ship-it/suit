import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["ar", "en"];

/** Edge middleware (more reliable than the Node-runtime proxy on Cloudflare). Send every page without a locale prefix to its Arabic (default) or preferred-language version. */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (LOCALES.includes(first)) return NextResponse.next();
  const cookie = request.cookies.get("suitly_lang")?.value;
  const locale = cookie && LOCALES.includes(cookie) ? cookie : "ar";
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!api|_next|art|uploads|brand|icon|favicon|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)"],
};
