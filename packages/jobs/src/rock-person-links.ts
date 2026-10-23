import { z } from "zod"
import { fetchPCO } from "@mt/api/pco"

const positiveId = z.number().int().positive()
const mapSchema = z.object({ id: positiveId, translatorId: z.string().min(1), actualId: z.string().regex(/^[1-9]\d*$/), identifierId: positiveId })
const aliasSchema = z.object({ Id: positiveId, PersonId: positiveId })
export type PluginMap = z.infer<typeof mapSchema>
export type PersonAlias = z.infer<typeof aliasSchema>
export type PersonLinks = { pcoToRock: Map<string, string>; conflicts: number }

/** Resolve aliases before checking uniqueness. Contradictory components stay separate. */
export function resolvePersonLinks(maps: PluginMap[], aliases: PersonAlias[], accountId: string): PersonLinks {
  const aliasPeople = new Map(aliases.map(a => [String(a.Id), String(a.PersonId)]))
  const identifiers = new Map<number, PluginMap[]>()
  for (const map of maps) identifiers.set(map.identifierId, [...(identifiers.get(map.identifierId) ?? []), map])
  const pairs: Array<[string, string]> = []
  const badPco = new Set<string>()
  const badRock = new Set<string>()
  for (const rows of identifiers.values()) {
    const rockRows = rows.filter(m => m.translatorId === "RockRMS")
    const rock = new Set(rockRows.map(m => aliasPeople.get(m.actualId)).filter((id): id is string => Boolean(id)))
    const pco = new Set(rows.filter(m => m.translatorId === accountId).map(m => m.actualId))
    if (rock.size > 1 || pco.size > 1 || rockRows.some(m => !aliasPeople.has(m.actualId))) {
      for (const id of pco) badPco.add(id)
      for (const id of rock) badRock.add(id)
    } else if (rock.size === 1 && pco.size === 1) pairs.push([[...pco][0]!, [...rock][0]!])
  }
  const pcoRocks = new Map<string, Set<string>>()
  const rockPcos = new Map<string, Set<string>>()
  for (const [pco, rock] of pairs) {
    pcoRocks.set(pco, new Set([...(pcoRocks.get(pco) ?? []), rock]))
    rockPcos.set(rock, new Set([...(rockPcos.get(rock) ?? []), pco]))
  }
  for (const [pco, rock] of pairs) if (pcoRocks.get(pco)!.size !== 1 || rockPcos.get(rock)!.size !== 1) badPco.add(pco)
  // Quarantine every connected target of a contradictory identifier, including
  // otherwise valid-looking links on a different AbstractIdentifier.
  let changed = true
  while (changed) {
    changed = false
    for (const [pco, rock] of pairs) if (badPco.has(pco) || badRock.has(rock)) {
      if (!badPco.has(pco) || !badRock.has(rock)) changed = true
      badPco.add(pco)
      badRock.add(rock)
    }
  }
  return { pcoToRock: new Map(pairs.filter(([pco]) => !badPco.has(pco))), conflicts: badPco.size }
}

export async function fetchPersonLinks(): Promise<PersonLinks> {
  const base = process.env.ROCK_BASE_URL?.replace(/\/$/, "")
  const key = process.env.ROCK_API_KEY
  if (!base && !key) return { pcoToRock: new Map(), conflicts: 0 }
  const accountId = process.env.ROCK_PCO_ACCOUNT_ID
  const organizationId = process.env.PCO_ORGANIZATION_ID
  if (!base || !key || !accountId || !organizationId) throw new Error("Authoritative person links require Rock credentials and pinned PCO account/organization IDs")
  async function request(path: string, body?: string): Promise<unknown> {
    const response = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { "Authorization-Token": key!, Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "text/plain" }) }, body,
    })
    if (!response.ok) throw new Error(`Rock identity API returned ${response.status}`)
    return response.json()
  }
  const accounts = z.record(z.string()).parse(await request("/api/com_9embers/pcov2"))
  const organization = z.object({ id: z.string() }).parse(await fetchPCO("/people/v2", AbortSignal.timeout(30000)))
  if (!Object.hasOwn(accounts, accountId) || organization.id !== organizationId) throw new Error("PCO identity account scope changed")
  const maps: PluginMap[] = []
  let last = 0
  for (let page = 0; ; page++) {
    if (page >= 1000) throw new Error("Rock identity map pagination limit exceeded")
    const template = `{% identifiermap where:'Id > ${last}' sort:'Id' limit:'500' %}[{% for m in identifiermapItems %}{"id":{{ m.Id }},"translatorId":{{ m.TranslatorId | ToJSON }},"actualId":{{ m.ActualId | ToJSON }},"identifierId":{{ m.AbstractIdentifierId }}}{% unless forloop.last %},{% endunless %}{% endfor %}]{% endidentifiermap %}`
    const rendered = z.string().parse(await request("/api/Lava/RenderTemplate", template))
    const rows = z.array(mapSchema).max(500).parse(JSON.parse(rendered))
    for (const row of rows) {
      if (row.id <= last) throw new Error("Rock identity maps are not strictly ordered")
      last = row.id
      maps.push(row)
    }
    if (rows.length === 0) break
  }
  const ids = [...new Set(maps.filter(m => m.translatorId === "RockRMS").map(m => m.actualId))]
  const aliases: PersonAlias[] = []
  for (let i = 0; i < ids.length; i += 10) {
    const query = new URLSearchParams({ "$filter": ids.slice(i, i + 10).map(id => `Id eq ${id}`).join(" or "), "$select": "Id,PersonId", "$top": "11" })
    const rows = z.array(aliasSchema).max(10).parse(await request(`/api/PersonAlias?${query}`))
    if (rows.some(row => !ids.slice(i, i + 10).includes(String(row.Id)))) throw new Error("Unexpected Rock person alias")
    aliases.push(...rows)
  }
  return resolvePersonLinks(maps, aliases, accountId)
}
