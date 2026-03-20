import { createEnv } from "@t3-oss/env-core";
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
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Allow build to succeed without env vars (e.g. CI, Docker build step).
  // Set SKIP_ENV_VALIDATION=1 to bypass validation.
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
