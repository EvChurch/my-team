import type PgBoss from "pg-boss"

import { SyncRockJob } from "./job.js"

export const SYNC_ROCK_QUEUE = "sync-rock"

export async function startSyncRockWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(SYNC_ROCK_QUEUE)
  await boss.work(SYNC_ROCK_QUEUE, async () => {
    await SyncRockJob()
  })
  await boss.schedule(SYNC_ROCK_QUEUE, "15 * * * *")
  await boss.send(SYNC_ROCK_QUEUE, {})
}
