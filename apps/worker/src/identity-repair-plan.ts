import { writeFile } from "node:fs/promises";
import { prisma } from "@mt/api/db";
import { readIdentityRepairPlan } from "@mt/jobs/identity-repair-plan";

const output = process.argv[2];
if (!output || output.startsWith("--")) throw new Error("Supply a new private JSON output path. This command only reads data.");
try {
  const plan = await readIdentityRepairPlan();
  // Exclusive creation prevents overwriting files or following existing symlinks.
  await writeFile(output, JSON.stringify(plan, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify(plan.summary));
} finally {
  await prisma.$disconnect();
}
