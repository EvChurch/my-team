import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    PCO_API_ID: z.string().min(1),
    PCO_API_SECRET: z.string().min(1),
    ROCK_BASE_URL: z.string().url().optional(),
    ROCK_API_KEY: z.string().optional(),
    ROCK_REST_KEY: z.string().optional(),
    ROCK_TEAM_GROUP_TYPE_IDS: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
