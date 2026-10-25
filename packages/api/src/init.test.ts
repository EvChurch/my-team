import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), rockPerson: vi.fn(), findSource: vi.fn(), findAccount: vi.fn(), upsertAccount: vi.fn(), lock: vi.fn(),
}));
vi.mock("@mt/auth", () => ({ auth: mocks.auth }));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("./lib/rock-login", async (original) => ({
  ...await original<typeof import("./lib/rock-login")>(), findRockLoginPerson: mocks.rockPerson,
}));
vi.mock("./db", () => ({ prisma: { $transaction: (run: (tx: unknown) => unknown) => run({
  $queryRaw: mocks.lock,
  sourcePerson: { findUnique: mocks.findSource },
  authAccount: { findUnique: mocks.findAccount, upsert: mocks.upsertAccount },
}) } }));
import { createTRPCContext, createTRPCRouter, protectedProcedure } from "./init";
import { RockLoginUnavailable } from "./lib/rock-login";

const router = createTRPCRouter({ teams: protectedProcedure.query(({ ctx }) => ctx.personIds) });
let source: { isActive: boolean; personId: string; person: { isActive: boolean; sourcePeople: { remoteId: string }[] } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|rowan", email: "rowan@example.com" } });
  mocks.rockPerson.mockResolvedValue("7548");
  source = { isActive: true, personId: "canonical", person: { isActive: true, sourcePeople: [{ remoteId: "7548" }] } };
  mocks.findSource.mockImplementation(async () => source);
  mocks.findAccount.mockResolvedValue(null);
  mocks.upsertAccount.mockResolvedValue({ personId: "canonical" });
});

describe("Rock identity access gate", () => {
  it("admits a Rock-only person without PCO or email proof", async () => {
    mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|rowan" } });
    const ctx = await createTRPCContext();
    await expect(router.createCaller(ctx).teams()).resolves.toEqual(["canonical"]);
    expect(mocks.rockPerson).toHaveBeenCalledWith("auth0|rowan");
    expect(mocks.findSource).toHaveBeenCalledWith({
      where: { provider_remoteId: { provider: "ROCK", remoteId: "7548" } },
      include: { person: { include: { sourcePeople: { where: { provider: "ROCK", isActive: true }, select: { remoteId: true } } } } },
    });
    expect(mocks.upsertAccount).toHaveBeenCalledWith({
      where: { provider_providerAccountId: { provider: "auth0", providerAccountId: "auth0|rowan" } },
      update: {}, create: { personId: "canonical", provider: "auth0", providerAccountId: "auth0|rowan", email: null },
    });
  });
  it("ignores a changed email when the existing link agrees with Rock", async () => {
    mocks.findAccount.mockResolvedValue({ personId: "canonical" });
    expect((await createTRPCContext()).personId).toBe("canonical");
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });
  it("blocks a missing Rock association even when there is an existing local account", async () => {
    mocks.rockPerson.mockResolvedValue(null);
    mocks.findAccount.mockResolvedValue({ personId: "canonical" });
    const ctx = await createTRPCContext();
    expect(ctx.personId).toBeNull();
    expect(ctx.identityError).toBe("unlinked");
    await expect(router.createCaller(ctx).teams()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.findAccount).not.toHaveBeenCalled();
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });
  it("does not use a matching email or PCO identity to bypass a missing Rock login", async () => {
    mocks.rockPerson.mockResolvedValue(null);
    const ctx = await createTRPCContext();
    expect(ctx.personIds).toEqual([]);
    expect(mocks.findSource).not.toHaveBeenCalled();
  });
  it("blocks temporarily when Rock verification fails", async () => {
    mocks.rockPerson.mockRejectedValue(new RockLoginUnavailable());
    const ctx = await createTRPCContext();
    expect(ctx.identityError).toBe("unavailable");
    await expect(router.createCaller(ctx).teams()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });
  it.each(["source", "person", "missing", "conflated"])("blocks an unavailable local Rock identity: %s", async (kind) => {
    if (kind === "source") source.isActive = false;
    if (kind === "person") source.person.isActive = false;
    if (kind === "missing") mocks.findSource.mockResolvedValue(null);
    if (kind === "conflated") source.person.sourcePeople.push({ remoteId: "other-rock-id" });
    expect((await createTRPCContext()).personId).toBeNull();
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });
  it("never reassigns an existing account to a different canonical person", async () => {
    mocks.findAccount.mockResolvedValue({ personId: "different-owner" });
    expect((await createTRPCContext()).personId).toBeNull();
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });
  it("blocks a conflicting concurrent account creation", async () => {
    mocks.upsertAccount.mockResolvedValue({ personId: "concurrent-different-owner" });
    expect((await createTRPCContext()).personId).toBeNull();
  });
  it("blocks unauthenticated requests without calling Rock", async () => {
    mocks.auth.mockResolvedValue(null);
    const ctx = await createTRPCContext();
    await expect(router.createCaller(ctx).teams()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.rockPerson).not.toHaveBeenCalled();
  });
});
