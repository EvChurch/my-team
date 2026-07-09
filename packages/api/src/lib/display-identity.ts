export type PersonDisplaySource = {
  id: string;
  displayName: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  image: string | null;
};

export type ProfileDisplaySource = PersonDisplaySource;

export const personDisplaySelect = {
  id: true,
  displayName: true,
  fullName: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  image: true,
} as const;

export const profileDisplaySelect = personDisplaySelect;

function isGeneratedPcoInitialsImage(src: string | null | undefined): boolean {
  return Boolean(
    src?.includes("avatars.planningcenteronline.com/uploads/initials/"),
  );
}

function cleanImage<T extends { image: string | null }>(person: T): T {
  return {
    ...person,
    image: isGeneratedPcoInitialsImage(person.image) ? null : person.image,
  };
}

export async function getPersonDisplayMap<T extends PersonDisplaySource>(
  people: T[],
) {
  return new Map(people.map((person) => [person.id, cleanImage(person)]));
}

export async function getProfileDisplayMap<T extends ProfileDisplaySource>(
  profiles: T[],
) {
  return getPersonDisplayMap(profiles);
}
