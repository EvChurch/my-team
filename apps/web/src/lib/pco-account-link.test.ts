import { beforeEach, describe, expect, it, vi } from "vitest";
import { decode, encode } from "next-auth/jwt";

const mocks = vi.hoisted(() => ({ discovery: vi.fn(), grant: vi.fn(), userInfo: vi.fn(), fetch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("openid-client", async (original) => ({
  ...await original<typeof import("openid-client")>(),
  discovery: mocks.discovery,
  authorizationCodeGrant: mocks.grant,
  fetchUserInfo: mocks.userInfo,
}));
import { beginPcoLink, completePcoLink, linkCookie } from "./pco-account-link";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTH_SECRET", "a-test-secret-with-at-least-32-characters");
  vi.stubEnv("APP_BASE_URL", "https://myteam.example.com");
  vi.stubEnv("PCO_OAUTH_CLIENT_ID", "oauth-client");
  vi.stubEnv("PCO_OAUTH_CLIENT_SECRET", "oauth-secret");
  mocks.discovery.mockResolvedValue({ serverMetadata: () => ({ authorization_endpoint: "https://api.planningcenteronline.com/oauth/authorize" }), clientMetadata: () => ({ client_id: "oauth-client" }) });
  mocks.grant.mockResolvedValue({ access_token: "access-token", claims: () => ({ sub: "pco-person" }) });
  mocks.userInfo.mockResolvedValue({ sub: "pco-person", organization_id: 123 });
  mocks.fetch.mockResolvedValue(Response.json({ data: { id: "123", type: "Organization" } }));
  vi.stubGlobal("fetch", mocks.fetch);
});

async function cookie(auth0Id = "auth0|volunteer", maxAge = 600) {
  return encode({ secret: process.env.AUTH_SECRET!, salt: linkCookie, maxAge, token: { auth0Id, verifier: "verifier", state: "state", nonce: "nonce" } });
}
const callback = new URL("https://myteam.example.com/api/account-link/pco/callback?code=code&state=state");

describe("PCO recovery proof", () => {
  it("rejects a flow from a different Auth0 session before exchanging tokens", async () => {
    await expect(completePcoLink("auth0|other", await cookie(), callback)).rejects.toThrow();
    expect(mocks.grant).not.toHaveBeenCalled();
  });
  it("rejects tampered and expired cookies before exchanging tokens", async () => {
    await expect(completePcoLink("auth0|volunteer", (await cookie()) + "tampered", callback)).rejects.toThrow();
    await expect(completePcoLink("auth0|volunteer", await cookie("auth0|volunteer", -60), callback)).rejects.toThrow();
    expect(mocks.grant).not.toHaveBeenCalled();
  });
  it("requires the OIDC client to validate state, nonce, PKCE, and an ID token", async () => {
    expect(await completePcoLink("auth0|volunteer", await cookie(), callback)).toBe("pco-person");
    expect(mocks.grant).toHaveBeenCalledWith(expect.anything(), callback, { pkceCodeVerifier: "verifier", expectedState: "state", expectedNonce: "nonce", idTokenExpected: true });
    expect(mocks.userInfo).toHaveBeenCalledWith(expect.anything(), "access-token", "pco-person");
  });
  it("rejects the same person ID from a different church", async () => {
    mocks.userInfo.mockResolvedValue({ sub: "pco-person", organization_id: 456 });
    await expect(completePcoLink("auth0|volunteer", await cookie(), callback)).rejects.toThrow("Different organization");
  });
  it("fails closed if the church cannot be verified", async () => {
    mocks.fetch.mockResolvedValue(new Response(null, { status: 403 }));
    await expect(completePcoLink("auth0|volunteer", await cookie(), callback)).rejects.toThrow("Organization unavailable");
  });
  it("creates encrypted, session-bound recovery data and requests identity only", async () => {
    // Use the real client's config so URL construction is exercised too.
    const { Configuration } = await import("openid-client");
    mocks.discovery.mockResolvedValue(new Configuration({ issuer: "https://api.planningcenteronline.com", authorization_endpoint: "https://api.planningcenteronline.com/oauth/authorize", token_endpoint: "https://api.planningcenteronline.com/oauth/token" }, "oauth-client", "oauth-secret"));
    const flow = await beginPcoLink("auth0|volunteer");
    const payload = await decode({ token: flow.cookie, secret: process.env.AUTH_SECRET!, salt: linkCookie });
    expect(payload?.auth0Id).toBe("auth0|volunteer");
    expect(flow.url.searchParams.get("scope")).toBe("openid");
    expect(flow.url.searchParams.get("state")).toBe(payload?.state);
    expect(flow.url.searchParams.get("nonce")).toBe(payload?.nonce);
    expect(flow.url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(flow.url.searchParams.get("redirect_uri")).toBe("https://myteam.example.com/api/account-link/pco/callback");
    expect(flow.url.href).not.toContain("oauth-secret");
    expect(flow.url.href).not.toContain(String(payload?.verifier));
  });
});
