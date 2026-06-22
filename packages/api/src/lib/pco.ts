import Jsona from "jsona"

const PCO_API = "https://api.planningcenteronline.com"
const jsonaFormatter = new Jsona()
const MAX_RATE_LIMIT_RETRIES = 3

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(signal.reason)
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout)
        reject(signal.reason)
      },
      { once: true }
    )
  })
}

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
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const res = await fetch(`${PCO_API}${path}`, {
      headers: { Authorization: `Basic ${pcoBasicAuth()}` },
      signal,
    })
    if (res.ok) {
      const text = await res.text()
      return jsonaFormatter.deserialize(text)
    }

    const text = await res.text()
    if (res.status !== 429 || attempt === MAX_RATE_LIMIT_RETRIES) {
      throw new Error(`PCO API ${res.status}: ${text}`)
    }

    const retryAfter = Number(res.headers.get("retry-after"))
    const delay = Number.isFinite(retryAfter)
      ? Math.max(retryAfter * 1000, 1000)
      : 2500 * (attempt + 1)
    await sleep(delay, signal)
  }

  throw new Error("PCO API request failed")
}
