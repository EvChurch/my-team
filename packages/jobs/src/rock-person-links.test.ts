import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchPersonLinks, resolvePersonLinks, type PluginMap } from "./rock-person-links"
vi.mock("@mt/api/pco", () => ({ fetchPCO: async () => ({ id: "71723" }) }))
const map = (identifierId: number, translatorId: string, actualId: string): PluginMap => ({ id: identifierId, identifierId, translatorId, actualId })
const aliases = [{ Id: 90, PersonId: 12 }, { Id: 91, PersonId: 12 }, { Id: 92, PersonId: 13 }]

describe("authoritative plugin person links", () => {
  it("resolves the alias ID space and accepts historical aliases of the same person", () => {
    const result = resolvePersonLinks([map(1, "RockRMS", "90"), map(1, "RockRMS", "91"), map(1, "account", "123")], aliases, "account")
    expect([...result.pcoToRock]).toEqual([["123", "12"]])
  })
  it("scopes PCO IDs to the configured account", () => {
    expect(resolvePersonLinks([map(1, "RockRMS", "90"), map(1, "other-account", "123")], aliases, "account").pcoToRock.size).toBe(0)
  })
  it("rejects contradictory Rock people and missing alias targets", () => {
    for (const alias of ["92", "999"]) {
      const result = resolvePersonLinks([map(1, "RockRMS", "90"), map(1, "RockRMS", alias), map(1, "account", "123")], aliases, "account")
      expect(result.pcoToRock.size).toBe(0)
      expect(result.conflicts).toBe(1)
    }
  })
  it("rejects multiple PCO people, even when split over separate identifiers", () => {
    for (const secondIdentifier of [1, 2]) {
      const result = resolvePersonLinks([map(1, "RockRMS", "90"), map(1, "account", "123"), map(secondIdentifier, "RockRMS", "91"), map(secondIdentifier, "account", "124")], aliases, "account")
      expect(result.pcoToRock.size).toBe(0)
    }
  })
  it("rejects one PCO person linked to distinct Rock people across identifiers", () => {
    const result = resolvePersonLinks([map(1, "RockRMS", "90"), map(1, "account", "123"), map(2, "RockRMS", "92"), map(2, "account", "123")], aliases, "account")
    expect(result.pcoToRock.size).toBe(0)
  })
})

describe("plugin API snapshot validation", () => {
  beforeEach(() => {
    vi.stubEnv("ROCK_BASE_URL", "https://rock.example")
    vi.stubEnv("ROCK_API_KEY", "test-key")
    vi.stubEnv("ROCK_PCO_ACCOUNT_ID", "account")
    vi.stubEnv("PCO_ORGANIZATION_ID", "71723")
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
  function server(rendered: unknown, aliasResponse: unknown = aliases) {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/pcov2")) return Response.json({ account: "Planning Center" })
      if (url.endsWith("/RenderTemplate")) return Response.json(rendered)
      return Response.json(aliasResponse)
    }))
  }
  it("parses the Lava JSON string and resolves only requested aliases", async () => {
    server(JSON.stringify([map(1, "RockRMS", "90"), { ...map(1, "account", "123"), id: 2 }]), [aliases[0]])
    expect([...(await fetchPersonLinks()).pcoToRock]).toEqual([["123", "12"]])
  })
  it("fails closed on malformed Lava output, unordered pagination, or unexpected aliases", async () => {
    server("Lava command unavailable")
    await expect(fetchPersonLinks()).rejects.toThrow()
    server(JSON.stringify([{ ...map(1, "RockRMS", "90"), id: 2 }, map(1, "account", "123")]))
    await expect(fetchPersonLinks()).rejects.toThrow("strictly ordered")
    server(JSON.stringify([map(1, "RockRMS", "90")]), [aliases[2]])
    await expect(fetchPersonLinks()).rejects.toThrow("Unexpected Rock person alias")
  })
  it("rejects a changed PAT organization before reading mappings", async () => {
    vi.stubEnv("PCO_ORGANIZATION_ID", "other")
    server("[]")
    await expect(fetchPersonLinks()).rejects.toThrow("account scope changed")
  })
  it("rejects an upstream failure rather than returning an empty snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })))
    await expect(fetchPersonLinks()).rejects.toThrow("503")
  })
})
