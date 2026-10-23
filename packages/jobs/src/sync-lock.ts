import pg from "pg"

/** Serialize complete provider syncs, including reconciliation and reference writes. */
export async function withSyncLock<T>(run: () => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, application_name: "myteam-identity-sync", connectionTimeoutMillis: 10000 })
  await client.connect()
  try {
    await client.query("SELECT pg_advisory_lock(724193822)")
    return await run()
  } finally {
    await client.query("SELECT pg_advisory_unlock(724193822)").catch(() => undefined)
    await client.end()
  }
}
