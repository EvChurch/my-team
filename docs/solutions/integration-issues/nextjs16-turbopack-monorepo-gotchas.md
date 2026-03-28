---
title: "Next.js 16 + Turbopack monorepo: extension resolution, proxy, and hydration gotchas"
category: integration-issues
date: 2026-03-20
tags: [nextjs, turbopack, monorepo, tiptap, trpc, tanstack-query]
components: [apps/web, packages/api, packages/auth]
severity: medium
---

# Next.js 16 + Turbopack Monorepo Gotchas

## Problem

Multiple subtle issues when running Next.js 16 with Turbopack in a Turborepo pnpm monorepo with internal TypeScript packages.

## Issues and Solutions

### 1. Turbopack does not resolve .js extensions to .ts files

Internal packages that use `.js` extensions in relative imports (e.g., `import { foo } from "./bar.js"`) fail under Turbopack even though they work with standard tsc.

**Fix:** Strip all `.js` extensions from relative imports in monorepo packages. Use extensionless imports (`import { foo } from "./bar"`).

### 2. Next.js 16 uses `proxy.ts` not `middleware.ts`

Auth.js v5 docs reference `middleware.ts`, but Next.js 16 renamed this to `proxy.ts`. Must use default export or named `proxy` export.

```typescript
// apps/web/proxy.ts
export { auth as default } from "@mt/auth";
```

### 3. Turbopack needs `turbopack.root` in worktrees

When using git worktrees (common with parallel agent development), Turbopack may fail to resolve the workspace root. Add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  turbopack: {
    root: "..",  // or appropriate relative path
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
};
```

### 4. @tanstack/react-query must be a direct dependency

Even though `@mt/api` depends on `@tanstack/react-query`, the web app must also list it as a direct dependency when using `HydrationBoundary`/`dehydrate` in Server Components. Turbopack won't resolve transitive deps from internal packages.

### 5. Tiptap 3 SSR requires immediatelyRender: false

Without this, Tiptap causes hydration mismatches in Next.js:

```typescript
const editor = useEditor({
  immediatelyRender: false,  // REQUIRED for SSR
  extensions: [StarterKit, Image],
});
```

For server-side rendering of stored JSON content, use the static renderer (no browser DOM needed):

```typescript
import { generateHTML } from "@tiptap/html";
// or @tiptap/static-renderer for pure server rendering
```

### 6. tRPC v11 cache invalidation uses queryOptions().queryKey

When invalidating queries after mutations in tRPC v11 with TanStack Query v5:

```typescript
queryClient.invalidateQueries({
  queryKey: trpc.goals.list.queryOptions().queryKey,
});
```

NOT the old v10 pattern of `trpc.goals.list.invalidate()`.

## Prevention

- Always test `pnpm build` from a clean state (no generated files) to catch resolution issues early
- Add `SKIP_ENV_VALIDATION=1` support for CI builds that don't need database access
- When adding new internal package dependencies, also add them as direct deps of consuming apps
