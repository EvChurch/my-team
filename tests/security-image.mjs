import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

assert.equal(process.version, "v22.23.4");
assert.equal(process.env.SSL_CERT_DIR, "/usr/local/share/security-ca/certs");
const badHosts = [
  "dv-g3b-emudhra.we-have-a-problem.com",
  "dv-g3b-aaa-emudhra.we-have-a-problem.com",
];
for (const host of badHosts) {
  await assert.rejects(
    fetch(`https://${host}/`, { signal: AbortSignal.timeout(20_000) }),
    (error) => error.cause?.code === "CERT_REVOKED",
  );
  const result = spawnSync(
    "openssl",
    [
      "s_client",
      "-connect",
      `${host}:443`,
      "-servername",
      host,
      "-verify_hostname",
      host,
      "-verify_return_error",
    ],
    { input: "", encoding: "utf8", timeout: 25_000 },
  );
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(
    result.stdout + result.stderr,
    /unable to get local issuer certificate/,
  );
}
const control = await fetch("https://www.google.com/generate_204", {
  signal: AbortSignal.timeout(20_000),
});
assert.equal(control.status, 204);
await control.body?.cancel();
const controlTls = spawnSync(
  "openssl",
  [
    "s_client",
    "-connect",
    "www.google.com:443",
    "-servername",
    "www.google.com",
    "-verify_hostname",
    "www.google.com",
    "-verify_return_error",
  ],
  { input: "", encoding: "utf8", timeout: 25_000 },
);
assert.equal(controlTls.error, undefined);
assert.equal(controlTls.status, 0);
assert.match(
  controlTls.stdout + controlTls.stderr,
  /Verify return code: 0 \(ok\)/,
);
// Exercise the installed build tool with isolated empty authentication config.
const scratch = mkdtempSync(join(tmpdir(), "myteam-package-trust-"));
try {
  const userConfig = join(scratch, "user.npmrc");
  const globalConfig = join(scratch, "global.npmrc");
  writeFileSync(userConfig, "");
  writeFileSync(globalConfig, "");
  for (const host of [...badHosts, "registry.npmjs.org"]) {
    const result = spawnSync(
      "pnpm",
      [
        "view",
        "is-number@7.0.0",
        "version",
        `--registry=https://${host}/`,
        "--fetch-retries=0",
        "--fetch-timeout=20000",
      ],
      {
        env: {
          ...process.env,
          npm_config_userconfig: userConfig,
          npm_config_globalconfig: globalConfig,
          npm_config_cache: join(scratch, "cache"),
        },
        encoding: "utf8",
        timeout: 30_000,
      },
    );
    assert.equal(result.error, undefined);
    if (badHosts.includes(host)) {
      assert.notEqual(result.status, 0);
      assert.match(
        result.stdout + result.stderr,
        /CERT_REVOKED|certificate revoked/,
      );
    } else {
      assert.equal(result.status, 0);
      assert.match(result.stdout, /7\.0\.0/);
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
console.log(
  "PASS: exact Node runtime; Node, OpenSSL and installed pnpm reject both affected chains; valid controls pass",
);
