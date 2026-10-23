import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { linkVerifiedPcoAccount } from "@mt/api/account-link";
import { callbackUrl, completePcoLink, linkCookie, linkCookieOptions } from "@/lib/pco-account-link";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const flow = cookieStore.get(linkCookie)?.value;
  cookieStore.set(linkCookie, "", { ...linkCookieOptions, maxAge: 0 });
  const origin = new URL(process.env.APP_BASE_URL!).origin;
  const session = await auth();
  if (!session?.user?.auth0Id) return NextResponse.redirect(new URL("/login", origin));
  try {
    if (!flow) throw new Error("Missing connection session");
    // Use the configured redirect URI, with only the callback query attached.
    const url = new URL(callbackUrl());
    url.search = new URL(request.url).search;
    const remoteId = await completePcoLink(session.user.auth0Id, flow, url);
    await linkVerifiedPcoAccount(session.user.auth0Id, remoteId, session.user.email ?? null);
    return NextResponse.redirect(new URL("/teams", origin));
  } catch {
    // OAuth responses and tokens must not appear in logs or in browser URLs.
    return NextResponse.redirect(new URL("/connect-account?error=connection", origin));
  }
}
