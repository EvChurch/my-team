/** Normalize directory contact data for display; these fields never establish identity. */
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

export type PersonIdentity = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};
