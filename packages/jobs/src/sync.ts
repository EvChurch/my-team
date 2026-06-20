import { SyncPcoJob } from "./sync-pco/job.js"
import { SyncRockJob } from "./sync-rock/job.js"

export async function syncAllDataOnce(): Promise<void> {
  await SyncPcoJob()
  await SyncRockJob()
}
