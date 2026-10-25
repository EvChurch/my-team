import { describe, expect, it } from "vitest";
import { normalizeIdentityEmail, normalizeIdentityPhone } from "./person-identity";

describe("directory contact normalization", () => {
  it("omits placeholder or malformed email addresses", () => {
    expect(normalizeIdentityEmail(" NA@NA.COM ")).toBeNull();
    expect(normalizeIdentityEmail("not an address")).toBeNull();
    expect(normalizeIdentityEmail(" Person@Example.com ")).toBe("person@example.com");
  });
  it("normalizes NZ domestic and PCO international phone formats", () => {
    expect(normalizeIdentityPhone("+64 022 656 8306")).toBe("+64226568306");
    expect(normalizeIdentityPhone("0226568306")).toBe("+64226568306");
    expect(normalizeIdentityPhone(null)).toBeNull();
  });
});
