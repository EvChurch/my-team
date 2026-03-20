import { auth } from "@repo/auth";

export const middleware = auth;

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
