import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, type Locale } from "./i18n/config";

function parseAcceptLanguage(header: string): Locale {
  const entries = header
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.trim(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    // Exact match
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
    // zh without region -> zh-CN
    if (lang === "zh") {
      return "zh-CN";
    }
    // Try base language match (e.g., "ko-KR" -> "ko")
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

export function middleware(request: NextRequest) {
  const localeCookie = request.cookies.get("locale")?.value;

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return NextResponse.next();
  }

  const acceptLanguage = request.headers.get("accept-language") || "";
  const locale = parseAcceptLanguage(acceptLanguage);

  const response = NextResponse.next();
  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
