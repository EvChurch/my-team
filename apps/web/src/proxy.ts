import { auth } from "@mt/auth";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales, type Locale } from "./i18n/config";

function parseAcceptLanguage(header: string): Locale {
  const entries = header
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.trim(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }

    if (lang === "zh") {
      return "zh-CN";
    }

    const base = lang.split("-")[0];
    if (base === "zh") {
      return "zh-CN";
    }
    if (locales.includes(base as Locale)) {
      return base as Locale;
    }
  }

  return defaultLocale;
}

function shouldSetLocaleCookie(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  return !pathname.startsWith("/api") && !pathname.includes(".");
}

export default auth((request) => {
  const response = NextResponse.next();
  const localeCookie = request.cookies.get("locale")?.value;

  if (
    shouldSetLocaleCookie(request) &&
    (!localeCookie || !locales.includes(localeCookie as Locale))
  ) {
    const acceptLanguage = request.headers.get("accept-language") || "";
    const locale = parseAcceptLanguage(acceptLanguage);

    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (Auth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - login page
     */
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|login).*)",
  ],
};
