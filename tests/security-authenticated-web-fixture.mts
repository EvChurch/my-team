import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { prisma } from "../packages/api/src/db";

const databaseUrl = process.env.IDENTITY_TEST_DATABASE_URL;
assert.ok(databaseUrl && databaseUrl === process.env.DATABASE_URL);
const database = new URL(databaseUrl);
assert.ok(database.pathname.endsWith("_test"));
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));

const root = fileURLToPath(new URL("../", import.meta.url));
const personId = "security-authenticated-web-fixture";
const remoteId = "987654321";
const secret = "disposable-authenticated-web-fixture-secret";
let created = false;
let child: ReturnType<typeof spawn> | undefined;
let rockReads = 0;
const rock = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://fixture.invalid");
  const path = url.pathname;
  response.setHeader("content-type", "application/json");
  if (request.headers["authorization-token"] !== "synthetic-fixture-key") {
    response.statusCode = 401;
    response.end(JSON.stringify({ error: "Invalid fixture credential" }));
    return;
  }
  if (
    request.method === "GET" &&
    path === "/api/UserLogins" &&
    url.searchParams.get("$filter") ===
      "UserName eq 'AUTH0_auth0|security-fixture' and IsConfirmed eq true and EntityType/Name eq 'Rock.Security.Authentication.Auth0.Auth0Authentication'"
  ) {
    rockReads++;
    response.end(
      JSON.stringify([{ PersonId: Number(remoteId), IsConfirmed: true }]),
    );
  } else if (
    request.method === "GET" &&
    path === "/api/People" &&
    url.searchParams.get("$filter") ===
      `Id eq ${remoteId} and RecordStatusValueId eq 3 and IsDeceased eq false`
  ) {
    rockReads++;
    response.end(JSON.stringify([{ Id: Number(remoteId) }]));
  } else {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: "Unexpected fixture request" }));
  }
});

try {
  assert.equal(await prisma.person.count({ where: { id: personId } }), 0);
  await prisma.person.create({
    data: {
      id: personId,
      displayName: "Security Fixture",
      fullName: "Security Fixture",
      firstName: "Security",
      lastName: "Fixture",
      sourcePeople: {
        create: {
          provider: "ROCK",
          remoteId,
          fullName: "Security Fixture",
          firstName: "Security",
          lastName: "Fixture",
        },
      },
    },
  });
  created = true;
  await new Promise<void>((resolve) => rock.listen(0, "127.0.0.1", resolve));
  const rockAddress = rock.address();
  assert.ok(rockAddress && typeof rockAddress !== "string");
  const reservation = createServer();
  await new Promise<void>((resolve) =>
    reservation.listen(0, "127.0.0.1", resolve),
  );
  const appAddress = reservation.address();
  assert.ok(appAddress && typeof appAddress !== "string");
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const base = `http://127.0.0.1:${appAddress.port}`;
  child = spawn("sh", ["apps/web/scripts/start-production.sh"], {
    cwd: root,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(appAddress.port),
      AUTH_SECRET: secret,
      AUTH_URL: base,
      AUTH_TRUST_HOST: "true",
      AUTH0_DOMAIN: "example.us.auth0.com",
      AUTH0_CLIENT_ID: "ci-placeholder",
      AUTH0_CLIENT_SECRET: "ci-placeholder",
      PCO_API_ID: "ci-placeholder",
      PCO_API_SECRET: "ci-placeholder",
      ROCK_BASE_URL: `http://127.0.0.1:${rockAddress.port}`,
      ROCK_API_KEY: "synthetic-fixture-key",
    },
  });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    assert.equal(child.exitCode, null, "production server exited early");
    try {
      const response = await fetch(`${base}/api/health`, {
        signal: AbortSignal.timeout(1_000),
      });
      ready = response.status === 200;
      await response.body?.cancel();
      if (ready) break;
    } catch {}
    await delay(500);
  }
  assert.ok(ready);
  const authRequire = createRequire(
    new URL("../packages/auth/package.json", import.meta.url),
  );
  const { encode } = await import(authRequire.resolve("@auth/core/jwt"));
  const token = await encode({
    secret,
    salt: "authjs.session-token",
    token: { sub: "security-fixture-user", auth0Id: "auth0|security-fixture" },
  });
  const anonymous = await fetch(`${base}/api/trpc/people.me`);
  assert.equal(anonymous.status, 401);
  await anonymous.body?.cancel();
  const headers = { cookie: `authjs.session-token=${token}` };
  const authenticated = await fetch(`${base}/api/trpc/people.me`, { headers });
  assert.equal(authenticated.status, 200);
  const result = await authenticated.json();
  assert.equal(result.result.data.json.id, personId);
  const teams = await fetch(`${base}/teams`, { headers, redirect: "manual" });
  assert.equal(teams.status, 200);
  assert.doesNotMatch(
    await teams.text(),
    /NEXT_HTTP_ERROR_FALLBACK;500|Application error:/,
  );
  const tampered = await fetch(`${base}/api/trpc/people.me`, {
    headers: { cookie: `authjs.session-token=${token}x` },
  });
  assert.equal(tampered.status, 401);
  await tampered.body?.cancel();
  await prisma.sourcePerson.update({
    where: { provider_remoteId: { provider: "ROCK", remoteId } },
    data: { isActive: false },
  });
  const revoked = await fetch(`${base}/api/trpc/people.me`, { headers });
  assert.equal(revoked.status, 401);
  await revoked.body?.cancel();
  assert.ok(rockReads >= 4);
  console.log(
    "PASS: actual production session/HTTP/Prisma read and teams page; unsigned, tampered and revoked-source access denied; only disposable identity/database/loopback Rock fixture used",
  );
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise<void>((resolve) => child!.once("exit", () => resolve())),
      delay(5_000),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  rock.closeAllConnections();
  if (rock.listening)
    await new Promise<void>((resolve) => rock.close(() => resolve()));
  if (created) {
    await prisma.person.delete({ where: { id: personId } });
    assert.equal(await prisma.person.count({ where: { id: personId } }), 0);
    assert.equal(await prisma.authAccount.count({ where: { personId } }), 0);
    assert.equal(await prisma.sourcePerson.count({ where: { personId } }), 0);
    console.log(
      "PASS: isolated fixture person, source and auth-account rows removed",
    );
  }
  await prisma.$disconnect();
}
