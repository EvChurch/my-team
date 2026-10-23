import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findRockLoginPerson, RockLoginUnavailable } from "./rock-login";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("ROCK_BASE_URL", "https://rock.example.com/");
  vi.stubEnv("ROCK_API_KEY", "test-rest-key");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function reply(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status }); }
function login(data: unknown = [{ PersonId: 7548, IsConfirmed: true }]) { fetchMock.mockResolvedValueOnce(reply(data)); }

describe("Rock Auth0 login verification", () => {
  it("uses the exact Auth0 subject and checks that its Rock person is active", async () => {
    login(); fetchMock.mockResolvedValueOnce(reply([{ Id: 7548 }]));
    expect(await findRockLoginPerson("google-oauth2|subject")).toBe("7548");
    const first = new URL(fetchMock.mock.calls[0]![0]);
    expect(first.pathname).toBe("/api/UserLogins");
    expect(first.searchParams.get("$filter")).toBe("UserName eq 'AUTH0_google-oauth2|subject' and IsConfirmed eq true and EntityType/Name eq 'Rock.Security.Authentication.Auth0.Auth0Authentication'");
    expect(first.searchParams.get("$top")).toBe("2");
    const second = new URL(fetchMock.mock.calls[1]![0]);
    expect(second.searchParams.get("$filter")).toBe("Id eq 7548 and RecordStatusValueId eq 3 and IsDeceased eq false");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ cache: "no-store", redirect: "error" });
  });
  it("escapes OData string literals in the subject", async () => {
    login([]);
    await findRockLoginPerson("auth0|a'b");
    expect(new URL(fetchMock.mock.calls[0]![0]).searchParams.get("$filter")).toContain("AUTH0_auth0|a''b'");
  });
  it.each([{ rows: [] }, { rows: [{ PersonId: 7548, IsConfirmed: true }, { PersonId: 8597, IsConfirmed: true }] }])("rejects missing or ambiguous login associations ($rows)", async ({ rows }) => {
    login(rows);
    expect(await findRockLoginPerson("auth0|subject")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects an inactive, deleted or deceased Rock person", async () => {
    login(); fetchMock.mockResolvedValueOnce(reply([]));
    expect(await findRockLoginPerson("auth0|subject")).toBeNull();
  });
  it("rejects a response for a different Rock person", async () => {
    login(); fetchMock.mockResolvedValueOnce(reply([{ Id: 9999 }]));
    expect(await findRockLoginPerson("auth0|subject")).toBeNull();
  });
  it.each([{ PersonId: 7548, IsConfirmed: false }, { PersonId: "7548", IsConfirmed: true }])("fails closed on invalid login data (%j)", async (row) => {
    login([row]);
    await expect(findRockLoginPerson("auth0|subject")).rejects.toBeInstanceOf(RockLoginUnavailable);
  });
  it.each([403, 500])("fails closed on an upstream %i without exposing its body", async (status) => {
    fetchMock.mockResolvedValueOnce(reply({ secret: "never expose upstream content" }, status));
    await expect(findRockLoginPerson("auth0|subject")).rejects.toThrow("Rock login verification unavailable");
  });
  it("fails closed when Rock is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    await expect(findRockLoginPerson("auth0|subject")).rejects.toBeInstanceOf(RockLoginUnavailable);
  });
  it("requires configured Rock credentials", async () => {
    vi.stubEnv("ROCK_API_KEY", "");
    await expect(findRockLoginPerson("auth0|subject")).rejects.toBeInstanceOf(RockLoginUnavailable);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
