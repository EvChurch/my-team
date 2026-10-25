import { z } from "zod";

const loginRows = z.array(z.object({ PersonId: z.number().int().positive(), IsConfirmed: z.literal(true) }));
const personRows = z.array(z.object({ Id: z.number().int().positive() }));

export class RockLoginUnavailable extends Error {
  constructor() { super("Rock login verification unavailable"); }
}

/** Use the association created by Auth0's Rock post-login hook, never local email matching. */
export async function findRockLoginPerson(auth0Id: string): Promise<string | null> {
  const base = process.env.ROCK_BASE_URL;
  const key = process.env.ROCK_API_KEY;
  if (!base || !key) throw new RockLoginUnavailable();

  async function read(path: string, params: Record<string, string>): Promise<unknown> {
    try {
      const response = await fetch(`${base!.replace(/\/$/, "")}${path}?${new URLSearchParams(params)}`, {
        headers: { "Authorization-Token": key!, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        redirect: "error",
      });
      if (!response.ok) throw new RockLoginUnavailable();
      return await response.json();
    } catch {
      // Do not expose upstream bodies, credentials, or login identifiers.
      throw new RockLoginUnavailable();
    }
  }

  const username = `AUTH0_${auth0Id}`.replace(/'/g, "''");
  const parsed = loginRows.safeParse(await read("/api/UserLogins", {
    $filter: `UserName eq '${username}' and IsConfirmed eq true and EntityType/Name eq 'Rock.Security.Authentication.Auth0.Auth0Authentication'`,
    $select: "PersonId,IsConfirmed", $top: "2",
  }));
  if (!parsed.success) throw new RockLoginUnavailable();
  if (parsed.data.length !== 1) return null;

  const personId = parsed.data[0]!.PersonId;
  const people = personRows.safeParse(await read("/api/People", {
    $filter: `Id eq ${personId} and RecordStatusValueId eq 3 and IsDeceased eq false`,
    $select: "Id", $top: "2",
  }));
  if (!people.success) throw new RockLoginUnavailable();
  return people.data.length === 1 && people.data[0]!.Id === personId ? String(personId) : null;
}
