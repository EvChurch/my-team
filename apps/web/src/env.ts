import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().optional(),
    AUTH0_SECRET: z.string().optional(),
    AUTH_AUTH0_ID: z.string().optional(),
    AUTH_AUTH0_SECRET: z.string().optional(),
    AUTH_AUTH0_ISSUER: z.string().url().optional(),
    AUTH0_DOMAIN: z.string().optional(),
    AUTH0_CLIENT_ID: z.string().optional(),
    AUTH0_CLIENT_SECRET: z.string().optional(),
    APP_BASE_URL: z.string().url().optional(),
    AUTH_PLANNING_CENTER_ID: z.string().optional(),
    AUTH_PLANNING_CENTER_SECRET: z.string().optional(),
    PCO_API_ID: z.string().min(1),
    PCO_API_SECRET: z.string().min(1),
    ROCK_BASE_URL: z.string().url().optional(),
    ROCK_API_KEY: z.string().optional(),
    ROCK_REST_KEY: z.string().optional(),
    ROCK_TEAM_GROUP_TYPE_IDS: z.string().optional(),
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
