import PgBoss from "pg-boss"

let instance: PgBoss | null = null

export async function getBoss(): Promise<PgBoss> {
  if (!instance) {
    instance = new PgBoss(process.env.DATABASE_URL!)
    instance.on("error", (e) => console.error("[pg-boss]", e))
    await instance.start()
  }
  return instance
}
