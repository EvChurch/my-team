---
title: "tRPC v11 Server Component prefetching and hydration pattern"
category: integration-issues
date: 2026-03-20
tags: [trpc, tanstack-query, server-components, hydration, nextjs]
components: [packages/api, apps/web]
severity: medium
---

# tRPC v11 Server Component Prefetching and Hydration

## Problem

Correctly prefetching tRPC data in Server Components and hydrating to client components in tRPC v11 with TanStack Query v5.

## Solution Pattern

### Server-side setup (packages/api/src/trpc/server.ts)

```typescript
import "server-only";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { makeQueryClient } from "./query-client";
import { createTRPCContext } from "../init";
import { appRouter } from "../routers/_app";

export const getQueryClient = cache(makeQueryClient);
export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});
```

### Server Component page pattern

```typescript
// page.tsx (Server Component)
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@mt/api/server";
import { MyContent } from "./my-content";

export default async function Page() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.teams.list.queryOptions());
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyContent />
    </HydrationBoundary>
  );
}
```

### Client Component consumer

```typescript
"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";

export function MyContent() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.teams.list.queryOptions());
  // render data
}
```

### Cache invalidation after mutations

```typescript
const queryClient = useQueryClient();
// After mutation success:
queryClient.invalidateQueries({
  queryKey: trpc.goals.list.queryOptions().queryKey,
});
```

NOT `trpc.goals.list.invalidate()` — that's the v10 pattern.

## Key Gotchas

1. `@tanstack/react-query` must be a **direct dependency** of the web app, not just transitive via `@mt/api`
2. `createTRPCOptionsProxy` replaces v10's `createHydrationHelpers`
3. `createTRPCContext` from `@trpc/tanstack-react-query` replaces `createTRPCReact`
4. Client hooks use native TanStack Query hooks (`useSuspenseQuery`, `useMutation`) with `trpc.route.queryOptions()` — NOT custom tRPC wrappers

## Prevention

- Always use `queryOptions()` to get both the query key and fetch function — it's the v11 way
- Test that prefetched data appears on initial render without a loading flash (proves hydration works)
