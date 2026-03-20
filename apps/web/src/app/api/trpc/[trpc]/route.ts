import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@mt/api/routers";
import { createTRPCContext } from "@mt/api/init";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
      }),
  });

export { handler as GET, handler as POST };
