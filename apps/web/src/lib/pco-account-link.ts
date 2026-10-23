import "server-only";
import * as oidc from "openid-client";
import { encode, decode } from "next-auth/jwt";

export const linkCookie = "myteam-pco-link";
export const linkCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/account-link/pco", maxAge: 600 };

export function accountLinkConfigured() {
  return Boolean(process.env.PCO_OAUTH_CLIENT_ID && process.env.PCO_OAUTH_CLIENT_SECRET && process.env.APP_BASE_URL && process.env.AUTH_SECRET);
}

export function callbackUrl() {
  return new URL("/api/account-link/pco/callback", process.env.APP_BASE_URL!).href;
}

export async function pcoOidcClient() {
  if (!accountLinkConfigured()) throw new Error("PCO connection unavailable");
  return oidc.discovery(new URL("https://api.planningcenteronline.com"), process.env.PCO_OAUTH_CLIENT_ID!, process.env.PCO_OAUTH_CLIENT_SECRET!, undefined, {
    [oidc.customFetch]: (url, options) => fetch(url, {
      ...options,
      body: options?.body instanceof Uint8Array ? new TextDecoder().decode(options.body) : options?.body,
      headers: { ...Object.fromEntries(new Headers(options?.headers)), "User-Agent": "My Team (https://myteam.ev.church)" },
      cache: "no-store", signal: AbortSignal.timeout(15000),
    }),
  });
}

export async function beginPcoLink(auth0Id: string) {
  const config = await pcoOidcClient();
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const cookie = await encode({ secret: process.env.AUTH_SECRET!, salt: linkCookie, maxAge: 600, token: { auth0Id, verifier, state, nonce } });
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl(), scope: "openid", prompt: "select_account", state, nonce,
    code_challenge_method: "S256", code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
  });
  return { cookie, url };
}

export async function completePcoLink(auth0Id: string, cookie: string, url: URL) {
  const flow = await decode({ token: cookie, secret: process.env.AUTH_SECRET!, salt: linkCookie });
  if (!flow || flow.auth0Id !== auth0Id || typeof flow.verifier !== "string" || typeof flow.state !== "string" || typeof flow.nonce !== "string") throw new Error("Invalid connection session");
  const config = await pcoOidcClient();
  const tokens = await oidc.authorizationCodeGrant(config, url, {
    pkceCodeVerifier: flow.verifier, expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true,
  });
  const claims = tokens.claims()!;
  const user = await oidc.fetchUserInfo(config, tokens.access_token, claims.sub);
  // PCO person IDs are scoped to an organization. Compare against the PAT's
  // organization, never against a user-controlled callback or email domain.
  const organization = await fetch("https://api.planningcenteronline.com/people/v2", {
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.PCO_API_ID}:${process.env.PCO_API_SECRET}`).toString("base64")}`, "User-Agent": "My Team (https://myteam.ev.church)" },
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!organization.ok) throw new Error("Organization unavailable");
  const body = await organization.json();
  if (!user.organization_id || !body.data?.id || String(user.organization_id) !== String(body.data.id)) throw new Error("Different organization");
  return user.sub;
}
