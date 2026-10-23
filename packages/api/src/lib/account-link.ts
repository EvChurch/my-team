import { prisma } from "../db";
import { compatiblePersonNames, type PersonIdentity } from "./person-identity";

export function unambiguousSourceGroup(sources: Array<PersonIdentity & { provider: string }>): boolean {
  return sources.length > 0 && new Set(sources.map((source) => source.provider)).size === sources.length &&
    sources.slice(1).every((source) => compatiblePersonNames(sources[0]!, source));
}

/** Only call with a PCO subject verified by the server's OIDC client. */
export async function linkVerifiedPcoAccount(auth0Id: string, remoteId: string, email: string | null) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(724193821)::text`;
    const source = await tx.sourcePerson.findUnique({
      where: { provider_remoteId: { provider: "PCO", remoteId } },
      include: { person: { include: { sourcePeople: { where: { isActive: true } } } } },
    });
    if (!source?.isActive || !source.person.isActive || !unambiguousSourceGroup(source.person.sourcePeople)) {
      throw new Error("PCO identity unavailable");
    }
    // A concurrent request or an existing session must never change ownership.
    const account = await tx.authAccount.upsert({
      where: { provider_providerAccountId: { provider: "auth0", providerAccountId: auth0Id } },
      create: { provider: "auth0", providerAccountId: auth0Id, personId: source.personId, email },
      update: {},
    });
    if (account.personId !== source.personId) throw new Error("Account already linked");
    return account.personId;
  });
}
