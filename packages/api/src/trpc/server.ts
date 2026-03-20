import "server-only";

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import { createTRPCContext } from "../init.js";
import { makeQueryClient } from "./query-client.js";
import { appRouter } from "../routers/_app.js";

/**
 * Stable getter for the query client — returns the same client
 * during a single server request (React `cache`).
 */
export const getQueryClient = cache(makeQueryClient);

/**
 * tRPC proxy for Server Components.
 * Usage: `const data = await trpc.people.me.query();`
 */
export const trpc = createTRPCOptionsProxy({
  ctx: async () =>
    createTRPCContext({
      headers: await headers(),
    }),
  router: appRouter,
  queryClient: getQueryClient,
});
