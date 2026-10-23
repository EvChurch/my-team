import { describe, expect, it } from "vitest";
import { matchingPersonEvidence, normalizeIdentityEmail, normalizeIdentityPhone, uniqueIdentityMatch } from "./person-identity";

const parent = { personId: "parent", firstName: "Ryan", lastName: "Green", email: "ryan@example.com", phone: "0226568306" };

describe("person identity evidence", () => {
  it("never merges family members sharing an email", () => {
    expect(matchingPersonEvidence(parent, { ...parent, firstName: "Owen", phone: null })).toBe(false);
  });
  it("rejects placeholder email evidence", () => {
    expect(normalizeIdentityEmail(" NA@NA.COM ")).toBeNull();
    expect(matchingPersonEvidence({ ...parent, email: "na@na.com", phone: null }, { ...parent, email: "na@na.com", phone: null })).toBe(false);
  });
  it("matches NZ domestic and PCO international phone formats", () => {
    expect(normalizeIdentityPhone("+64 022 656 8306")).toBe("+64226568306");
    expect(matchingPersonEvidence(parent, { ...parent, phone: "+64 22 656 8306" })).toBe(true);
  });
  it("requires more than matching contact details", () => {
    expect(matchingPersonEvidence(parent, { ...parent, firstName: "Owen" })).toBe(false);
  });
  it("rejects conflicting known phone numbers even with matching names and email", () => {
    expect(matchingPersonEvidence(parent, { ...parent, phone: "0211234567" })).toBe(false);
  });
  it("supports quoted preferred names without matching arbitrary initials", () => {
    const jono = { ...parent, firstName: "Jono", lastName: "Ng" };
    expect(matchingPersonEvidence(jono, { ...jono, firstName: 'Jonathan "Jono"' })).toBe(true);
    expect(matchingPersonEvidence(jono, { ...jono, firstName: "J" })).toBe(false);
  });
  it("refuses two otherwise equally plausible people", () => {
    expect(uniqueIdentityMatch(parent, [parent, { ...parent, personId: "other" }])).toBeNull();
  });
  it("counts source aliases belonging to the same person once", () => {
    expect(uniqueIdentityMatch(parent, [parent, { ...parent, phone: "+64226568306" }])).toBe("parent");
  });
  it("does not overlook contradictory middle names or split an apostrophe into an alias", () => {
    expect(matchingPersonEvidence({ ...parent, firstName: "Ryan James" }, { ...parent, firstName: "Ryan Paul" })).toBe(false);
    expect(matchingPersonEvidence({ ...parent, firstName: "D'Arcy" }, { ...parent, firstName: "Arcy" })).toBe(false);
  });

});
