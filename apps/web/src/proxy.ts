import { auth } from "@mt/auth";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales, type Locale } from "./i18n/config";

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
    response.cookies.set("locale", defaultLocale, {
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
