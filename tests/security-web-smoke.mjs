import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const base = "http://127.0.0.1:3000";
let ready = false;
for (let attempt = 0; attempt < 80; attempt++) {
  try {
    const response = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(1_000),
    });
    ready = response.status === 200 && (await response.text()) === "OK";
    if (ready) break;
  } catch {}
  await delay(500);
}
assert.ok(
  ready,
  "production image did not pass health through its startup script",
);
const home = await fetch(base, { redirect: "manual" });
assert.equal(home.status, 307);
assert.equal(new URL(home.headers.get("location"), base).pathname, "/teams");
await home.body?.cancel();
const teams = await fetch(`${base}/teams`, { redirect: "manual" });
assert.equal(teams.status, 307);
assert.equal(new URL(teams.headers.get("location"), base).pathname, "/login");
await teams.body?.cancel();
const login = await fetch(`${base}/login`);
assert.equal(login.status, 200);
const html = await login.text();
assert.match(html, /My Team/);
const assetPath = html.match(
  /(?:src|href)="([^"?]*\/_next\/static\/[^"?]+\.js)(?:\?[^" ]*)?"/,
)?.[1];
assert.ok(assetPath, "login page should include a production script asset");
const asset = await fetch(new URL(assetPath, base));
assert.equal(asset.status, 200);
assert.ok((await asset.text()).length > 0);
console.log(
  "PASS: actual web image startup, health, anonymous guard, login and served static asset",
);
