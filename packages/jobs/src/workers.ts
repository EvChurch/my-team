import type PgBoss from "pg-boss"

import { startSyncPcoWorker } from "./sync-pco/index.js"

export async function startWorkers(boss: PgBoss): Promise<void> {
  await startSyncPcoWorker(boss)
}
