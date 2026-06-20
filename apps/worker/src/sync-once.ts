import "./env" // Validate env vars at startup
import { syncAllDataOnce } from "@mt/jobs/sync"
import { prisma } from "@mt/api/db"

async function main() {
  console.log("[worker] Starting one-shot data sync...")
  await syncAllDataOnce()
  console.log("[worker] One-shot data sync complete.")
}

main()
  .catch((error) => {
    console.error("[worker]", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
