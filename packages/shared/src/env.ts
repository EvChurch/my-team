import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(1),
    AUTH_PLANNING_CENTER_ID: z.string().min(1),
    AUTH_PLANNING_CENTER_SECRET: z.string().min(1),
    PCO_API_ID: z.string().min(1),
    PCO_API_SECRET: z.string().min(1),
  },
  client: {
    // Add NEXT_PUBLIC_ client vars here as needed
  },
  experimental__runtimeEnv: {
    // Map client vars here, e.g.:
    // NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
