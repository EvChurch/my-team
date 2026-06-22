import { prisma } from "../db";

export type PersonDisplaySource = {
  id: string;
  provider: "PCO" | "ROCK";
  remoteId: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  firstName: string;
  lastName: string;
  image: string | null;
};

export type ProfileDisplaySource = {
  id: string;
  displayName: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  image: string | null;
};

export const personDisplaySelect = {
  id: true,
  provider: true,
  remoteId: true,
  email: true,
  phone: true,
  fullName: true,
  firstName: true,
  lastName: true,
  image: true,
} as const;

export const profileDisplaySelect = {
  id: true,
  displayName: true,
  fullName: true,
  firstName: true,
  lastName: true,
  email: true,
  image: true,
} as const;

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function lastNameToken(
  person: Pick<PersonDisplaySource, "fullName" | "lastName">,
) {
  const source = person.lastName || person.fullName;
  return normalize(source).split(/\s+/).filter(Boolean).at(-1) ?? "";
}

function isGeneratedPcoInitialsImage(src: string | null | undefined): boolean {
  return Boolean(
    src?.includes("avatars.planningcenteronline.com/uploads/initials/"),
  );
}

function displayImage(
  preferredImage: string | null | undefined,
  fallbackImage: string | null | undefined,
) {
  if (preferredImage && !isGeneratedPcoInitialsImage(preferredImage)) {
    return preferredImage;
  }

  return fallbackImage && !isGeneratedPcoInitialsImage(fallbackImage)
    ? fallbackImage
    : null;
}

function findRockByHeuristic(
  person: PersonDisplaySource,
  rockPeople: PersonDisplaySource[],
) {
  if (person.provider === "ROCK") return person;

  const email = normalize(person.email);
  if (email) {
    const emailMatch = rockPeople.find(
      (rockPerson) => normalize(rockPerson.email) === email,
    );
    if (emailMatch) return emailMatch;
  }

  const nameMatches = rockPeople.filter((rockPerson) => {
    if (normalize(rockPerson.fullName) === normalize(person.fullName)) {
      return true;
    }

    return (
      Boolean(normalize(person.firstName)) &&
      normalize(rockPerson.firstName) === normalize(person.firstName) &&
      Boolean(lastNameToken(person)) &&
      lastNameToken(rockPerson) === lastNameToken(person)
    );
  });

  return nameMatches.length === 1 ? nameMatches[0] : null;
}

function applyRockDisplay<T extends PersonDisplaySource>(
  person: T,
  rockPerson: PersonDisplaySource | null,
): T {
  if (!rockPerson) {
    return {
      ...person,
      image: displayImage(null, person.image),
    };
  }

  return {
    ...person,
    fullName: rockPerson.fullName,
    firstName: rockPerson.firstName,
    lastName: rockPerson.lastName,
    email: rockPerson.email ?? person.email,
    phone: rockPerson.phone ?? person.phone,
    image: displayImage(rockPerson.image, person.image),
  };
}

export async function getPersonDisplayMap<T extends PersonDisplaySource>(
  people: T[],
) {
  const uniquePeople = Array.from(
    new Map(people.map((person) => [person.id, person])).values(),
  );
  const displayMap = new Map<string, T>();

  if (uniquePeople.length === 0) return displayMap;

  const [rockPeople, identityLinks] = await Promise.all([
    prisma.person.findMany({
      where: { provider: "ROCK" },
      select: personDisplaySelect,
    }),
    prisma.profileIdentity.findMany({
      where: {
        personId: { in: uniquePeople.map((person) => person.id) },
      },
      select: {
        personId: true,
        profile: {
          select: {
            identities: {
              where: {
                provider: "ROCK",
                personId: { not: null },
              },
              select: {
                person: {
                  select: personDisplaySelect,
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const linkedRockPeople = new Map<string, PersonDisplaySource>();
  for (const link of identityLinks) {
    if (!link.personId) continue;
    const peopleFromProfile = link.profile.identities
      .map((identity) => identity.person)
      .filter((person): person is PersonDisplaySource => Boolean(person));

    if (peopleFromProfile.length === 1) {
      linkedRockPeople.set(link.personId, peopleFromProfile[0]!);
    }
  }

  for (const person of uniquePeople) {
    const rockPerson =
      linkedRockPeople.get(person.id) ??
      findRockByHeuristic(person, rockPeople);
    displayMap.set(person.id, applyRockDisplay(person, rockPerson));
  }

  return displayMap;
}

export async function getProfileDisplayMap<T extends ProfileDisplaySource>(
  profiles: T[],
) {
  const uniqueProfiles = Array.from(
    new Map(profiles.map((profile) => [profile.id, profile])).values(),
  );
  const displayMap = new Map<string, T>();

  if (uniqueProfiles.length === 0) return displayMap;

  const identityLinks = await prisma.profileIdentity.findMany({
    where: {
      profileId: { in: uniqueProfiles.map((profile) => profile.id) },
      provider: "ROCK",
      personId: { not: null },
    },
    select: {
      profileId: true,
      person: {
        select: personDisplaySelect,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const rockByProfile = new Map<string, PersonDisplaySource>();
  for (const link of identityLinks) {
    if (link.person && !rockByProfile.has(link.profileId)) {
      rockByProfile.set(link.profileId, link.person);
    }
  }

  for (const profile of uniqueProfiles) {
    const rockPerson = rockByProfile.get(profile.id);
    displayMap.set(
      profile.id,
      rockPerson
        ? {
            ...profile,
            displayName: rockPerson.fullName,
            fullName: rockPerson.fullName,
            firstName: rockPerson.firstName,
            lastName: rockPerson.lastName,
            email: rockPerson.email ?? profile.email,
            image: displayImage(rockPerson.image, profile.image),
          }
        : {
            ...profile,
            image: displayImage(null, profile.image),
          },
    );
  }

  return displayMap;
}
