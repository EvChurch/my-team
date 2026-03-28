import Jsona from "jsona"

const PCO_API = "https://api.planningcenteronline.com"
const jsonaFormatter = new Jsona()

export function pcoBasicAuth(): string {
  return Buffer.from(
    `${process.env.PCO_API_ID}:${process.env.PCO_API_SECRET}`,
    "utf8"
  ).toString("base64")
}

export async function fetchPCO(
  path: string,
  signal?: AbortSignal
): Promise<unknown> {
  const res = await fetch(`${PCO_API}${path}`, {
    headers: { Authorization: `Basic ${pcoBasicAuth()}` },
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PCO API ${res.status}: ${text}`)
  }
  const text = await res.text()
  return jsonaFormatter.deserialize(text)
}
