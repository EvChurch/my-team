# Controlled builds for the runtime and CA remediation

The serving Node and OS certificate stores were patched previously. The managed
Railpack bootstrap still uses an affected certificate store before application
install hooks can run. Build both existing services from a digest-pinned official
Node 22.23.4 image instead. Filter the inherited CA selection before the first apt
network request, refresh it, and keep all OpenSSL clients on the filtered hashed
directory before installing pnpm or dependencies.

Use an allowlist for the Docker context and exclude nested environment files,
caches and generated output. Generate Prisma and build both services with a dummy
loopback database URL. Accept only the existing public Railway version/environment
build identifiers. Retain service start commands, web migration/health checks,
worker shutdown grace, runtime variables and all application behavior.

Validate the actual production image in CI, including Node/OpenSSL rejection of
both affected chains and valid controls. Run existing API/worker tests with their
guarded disposable test database. Retain the normal PR checks and merge/release
flow; independently map and probe every serving replica after autodeployment.
Authentication and guarded worker fixtures remain separate completion evidence;
do not invoke real PCO/Rock syncs or other production jobs for this change.

## Docker startup follow-up

The first worker image passed live verification, but the web replacement failed
health while its previous replica remained active. Ranked explanations were Docker
exec-form handling of shell operators, listener binding and missing runtime files.
The old multi-command start override fails when executed directly; Railway's
[documented Docker start behavior](https://docs.railway.com/deployments/start-command)
confirms that these overrides do not imply a shell.

Move the existing asset-copy/start sequence into an explicit shell script, bind
Next's standalone listener to all interfaces, and exec Node for normal shutdown
signals. Use the same script in the image CMD and service override. Image CI must
boot this actual entrypoint with an initially unresolvable hostname and disposable
configuration, then pass health, root/teams anonymous guards, login and a static
asset. The local built-artifact smoke passes. No migration, auth, sync or domain
behavior changes; keep normal PR checks and autodeployment. Revalidate both shared
image services after release, even though the worker start command is unchanged.
