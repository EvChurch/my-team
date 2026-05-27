import type PgBoss from "pg-boss"

import { startSyncPcoWorker } from "./sync-pco/index.js"
import { startSyncRockWorker } from "./sync-rock/index.js"

export async function startWorkers(boss: PgBoss): Promise<void> {
  await startSyncPcoWorker(boss)
  await startSyncRockWorker(boss)
}
