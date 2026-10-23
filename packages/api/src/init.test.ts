import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findAccount: vi.fn(),
  createAccount: vi.fn(),
  findPeople: vi.fn(),
}));

vi.mock("@mt/auth", () => ({ auth: mocks.auth }));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("./db", () => ({
  prisma: {
    authAccount: { findUnique: mocks.findAccount, upsert: mocks.createAccount },
    person: { findMany: mocks.findPeople },
  },
}));

import { createTRPCContext, createTRPCRouter, protectedProcedure } from "./init";

type Person = {
  id: string;
  email: string;
  isActive: boolean;
  sourcePeople: Array<{ email: string; provider?: string; firstName?: string; lastName?: string; phone?: string | null; isActive?: boolean }>;
};

type Lookup = {
  isActive?: boolean;
  email?: string | { equals: string; mode?: string };
  OR?: Lookup[];
  sourcePeople?: { some: Lookup };
};

// Evaluate the actual lookup against a small production-shaped directory.
function matches(person: { email: string; isActive?: boolean; sourcePeople?: Array<{ email: string; provider?: string; firstName?: string; lastName?: string; phone?: string | null; isActive?: boolean }> }, where: Lookup): boolean {
  if (where.isActive !== undefined && person.isActive !== where.isActive) return false;
  if (where.email !== undefined) {
    const filter = where.email;
    if (typeof filter === "string") {
      if (person.email !== filter) return false;
    } else if (filter.mode === "insensitive") {
      if (person.email.toLowerCase() !== filter.equals.toLowerCase()) return false;
    } else if (person.email !== filter.equals) return false;
  }
  if (where.OR && !where.OR.some((clause) => matches(person, clause))) return false;
  if (where.sourcePeople && !person.sourcePeople?.some((source) => matches(source, where.sourcePeople!.some))) return false;
  return true;
}

let people: Person[];
const router = createTRPCRouter({ teams: protectedProcedure.query(({ ctx }) => ctx.personIds) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|rowan", auth0EmailVerified: true, email: "rowan@ev.church" } });
  mocks.findAccount.mockResolvedValue(null);
  mocks.createAccount.mockResolvedValue({ personId: "canonical" });
  people = [
    { id: "canonical", email: "rowan@ev.church", isActive: true, sourcePeople: [{ email: "rowan@aucklandev.co.nz", isActive: true }] },
    { id: "archived", email: "rowan@ev.church", isActive: false, sourcePeople: [] },
    { id: "archived-alias", email: "rowan@aucklandev.co.nz", isActive: false, sourcePeople: [] },
  ];
  mocks.findPeople.mockImplementation(async ({ where, take }) =>
    people.filter((person) => matches(person, where)).slice(0, take).map((person) => ({ ...person, sourcePeople: person.sourcePeople.map((source) => ({ provider: "ROCK", firstName: "Rowan", lastName: "Smith", phone: null, ...source })) })),
  );
});

describe("first sign-in person resolution", () => {
  it("loads protected data when an archived duplicate shares the login email", async () => {
    const ctx = await createTRPCContext();
    await expect(router.createCaller(ctx).teams()).resolves.toEqual(["canonical"]);
    expect(mocks.createAccount).toHaveBeenCalledWith({
      where: { provider_providerAccountId: { provider: "auth0", providerAccountId: "auth0|rowan" } },
      update: {}, create: {
      personId: "canonical", provider: "auth0", providerAccountId: "auth0|rowan", email: "rowan@ev.church",
    } });
  });

  it("resolves a source email alias to the active canonical person", async () => {
    mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|rowan", auth0EmailVerified: true, email: "rowan@aucklandev.co.nz" } });
    const ctx = await createTRPCContext();
    await expect(router.createCaller(ctx).teams()).resolves.toEqual(["canonical"]);
  });

  it("normalizes whitespace and email casing", async () => {
    mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|rowan", auth0EmailVerified: true, email: " ROWAN@EV.CHURCH " } });
    expect((await createTRPCContext()).personId).toBe("canonical");
  });

  it("does not choose between two active people sharing an email", async () => {
    people[1]!.isActive = true;
    expect((await createTRPCContext()).personId).toBeNull();
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it("does not link a person whose only matches are archived", async () => {
    people[0]!.isActive = false;
    expect((await createTRPCContext()).personId).toBeNull();
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it("preserves an existing account link without matching email again", async () => {
    mocks.findAccount.mockResolvedValue({ personId: "already-linked" });
    expect((await createTRPCContext()).personId).toBe("already-linked");
    expect(mocks.findPeople).not.toHaveBeenCalled();
  });

  it("does not look up people without an email", async () => {
    mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|rowan" } });
    expect((await createTRPCContext()).personId).toBeNull();
    expect(mocks.findPeople).not.toHaveBeenCalled();
  });
  it("does not treat placeholder email as proof of identity", async () => {
    mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|new", auth0EmailVerified: true, email: "na@na.com" } });
    expect((await createTRPCContext()).personId).toBeNull();
    expect(mocks.findPeople).not.toHaveBeenCalled();
  });

  it("does not create a new login link into a conflated source group", async () => {
    people[0]!.sourcePeople.push({ email: "other@example.com", firstName: "Other", lastName: "Smith", isActive: true });
    expect((await createTRPCContext()).personId).toBeNull();
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it("honors the winner if a concurrent request already created the account link", async () => {
    mocks.createAccount.mockResolvedValue({ personId: "concurrent-winner" });
    expect((await createTRPCContext()).personId).toBe("concurrent-winner");
  });

  it("does not use an inactive source email alias for a new link", async () => {
    mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|new", auth0EmailVerified: true, email: "rowan@aucklandev.co.nz" } });
    people[0]!.sourcePeople[0]!.isActive = false;
    expect((await createTRPCContext()).personId).toBeNull();
  });

  it("requires a verified login email before creating an automatic link", async () => {
    mocks.auth.mockResolvedValue({ user: { auth0Id: "auth0|new", email: "rowan@ev.church", auth0EmailVerified: false } });
    expect((await createTRPCContext()).personId).toBeNull();
    expect(mocks.findPeople).not.toHaveBeenCalled();
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

});
