/** Contact details are evidence for cross-provider linking, never source IDs. */
const placeholderEmails = new Set(["na@na.com", "n/a", "na", "none", "unknown"]);

export function normalizeIdentityEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email && !placeholderEmails.has(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

export function normalizeIdentityPhone(value: string | null | undefined): string | null {
  const phone = value?.replace(/[^\d+]/g, "");
  if (!phone) return null;
  // Rock uses NZ domestic numbers; PCO also supplies +640-prefixed numbers.
  if (/^(?:\+64|64)0?\d{7,10}$/.test(phone)) return `+64${phone.replace(/^(?:\+64|64)0?/, "")}`;
  if (/^0[2-9]\d{6,9}$/.test(phone)) return `+64${phone.slice(1)}`;
  return phone;
}

function nameWords(value: string): string[] {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export type PersonIdentity = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

export function compatiblePersonNames(a: PersonIdentity, b: PersonIdentity): boolean {
  const aFirst = nameWords(a.firstName);
  const bFirst = nameWords(b.firstName);
  const last = nameWords(a.lastName).join(" ");
  if (!last || last !== nameWords(b.lastName).join(" ")) return false;
  // Only explicit, paired quotes introduce an alias; an apostrophe inside a
  // name (for example D'Arcy) must not turn every name token into an alias.
  const preferredNames = (value: string) => [...value.matchAll(/(?:"([^"\n]+)"|“([^”\n]+)”|‘([^’\n]+)’|'([^'\n]+)')/gu)]
    .map((match) => nameWords(match[1] ?? match[2] ?? match[3] ?? match[4] ?? "").join(" "));
  const aGiven = aFirst.join(" ");
  const bGiven = bFirst.join(" ");
  return Boolean(aGiven && bGiven && (
    aGiven === bGiven || preferredNames(a.firstName).includes(bGiven) || preferredNames(b.firstName).includes(aGiven)
  ));
}

export function matchingPersonEvidence(a: PersonIdentity, b: PersonIdentity): boolean {
  if (!compatiblePersonNames(a, b)) return false;
  const email = normalizeIdentityEmail(a.email);
  const phone = normalizeIdentityPhone(a.phone);
  const otherPhone = normalizeIdentityPhone(b.phone);
  // Contradictory known phones rule out an automatic cross-provider link.
  if (phone && otherPhone && phone !== otherPhone) return false;
  return Boolean((phone && phone === otherPhone) || (email && email === normalizeIdentityEmail(b.email)));
}

export function uniqueIdentityMatch<T extends PersonIdentity & { personId: string }>(
  identity: PersonIdentity,
  candidates: T[],
): string | null {
  const matches = new Set(candidates.filter((candidate) => matchingPersonEvidence(identity, candidate)).map((candidate) => candidate.personId));
  return matches.size === 1 ? matches.values().next().value! : null;
}
