import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    AUTH_PLANNING_CENTER_ID: z.string().min(1),
    AUTH_PLANNING_CENTER_SECRET: z.string().min(1),
    PCO_API_ID: z.string().min(1),
    PCO_API_SECRET: z.string().min(1),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
});
