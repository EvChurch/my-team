import { fetchPersonLinks } from "@mt/jobs/rock-person-links"

// Exercise the built artifact, including its actual resolved schema dependencies.
// The self-test uses no database, credentials, or external requests.
const selfTest = process.argv.includes("--self-test")
if (selfTest) {
  process.env.ROCK_BASE_URL = "https://rock.test"
  process.env.ROCK_API_KEY = "self-test"
  process.env.ROCK_PCO_ACCOUNT_ID = "self-test-account"
  process.env.PCO_ORGANIZATION_ID = "71723"
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    if (url.hostname === "api.planningcenteronline.com" && url.pathname === "/people/v2") {
      return Response.json({ data: { type: "Organization", id: "71723", attributes: {} } })
    }
    if (url.hostname !== "rock.test") throw new Error("Unexpected identity self-test request")
    if (url.pathname === "/api/com_9embers/pcov2") return Response.json({ "self-test-account": "Planning Center" })
    if (url.pathname === "/api/PersonAlias") return Response.json([{ Id: 101, PersonId: 202 }])
    if (url.pathname === "/api/Lava/RenderTemplate") {
      const rows = String(init?.body).includes("Id > 0'") ? [
        { id: 1, translatorId: "RockRMS", actualId: "101", identifierId: 1 },
        { id: 2, translatorId: "self-test-account", actualId: "303", identifierId: 1 },
      ] : []
      return Response.json(JSON.stringify(rows))
    }
    throw new Error("Unexpected identity self-test endpoint")
  }
}

fetchPersonLinks().then(links => {
  if (selfTest && (links.pcoToRock.size !== 1 || links.pcoToRock.get("303") !== "202" || links.conflicts !== 0)) {
    throw new Error("Built worker identity self-test failed")
  }
  console.log(JSON.stringify({ identityCheck: "passed", links: links.pcoToRock.size, conflicts: links.conflicts, selfTest }))
}).catch(error => {
  console.error(error)
  process.exitCode = 1
})
