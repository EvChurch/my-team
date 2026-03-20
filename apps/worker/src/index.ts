import "./env" // Validate env vars at startup
import { getBoss } from "@repo/jobs/boss"
import { startWorkers } from "@repo/jobs/workers"

async function main() {
  console.log("[worker] Starting...")
  const boss = await getBoss()

  process.on("SIGTERM", async () => {
    console.log("[worker] SIGTERM received, shutting down gracefully...")
    await boss.stop({ graceful: true, timeout: 30_000 })
    console.log("[worker] Stopped.")
    process.exit(0)
  })

  process.on("SIGINT", async () => {
    console.log("[worker] SIGINT received, shutting down gracefully...")
    await boss.stop({ graceful: true, timeout: 30_000 })
    console.log("[worker] Stopped.")
    process.exit(0)
  })

  await startWorkers(boss)
  console.log("[worker] All workers started.")
}

main().catch((e) => {
  console.error("[worker]", e)
  process.exit(1)
})
