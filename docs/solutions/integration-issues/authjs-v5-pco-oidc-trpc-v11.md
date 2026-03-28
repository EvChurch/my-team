---
title: "Auth.js v5 with PCO OIDC + tRPC v11 context integration"
category: integration-issues
date: 2026-03-20
tags: [authjs, next-auth, pco, oidc, trpc, oauth]
components: [packages/auth, packages/api]
severity: medium
---

# Auth.js v5 with PCO OIDC + tRPC v11 Context Integration

## Problem

Setting up Auth.js v5 (next-auth@beta) with a custom Planning Center OIDC provider, then wiring the session into tRPC v11's context so all procedures can check auth and leader status.

## Key Learnings

### PCO supports OIDC discovery

Planning Center's OIDC endpoint (`https://api.planningcenteronline.com/.well-known/openid-configuration`) allows using `type: "oidc"` with just an `issuer` URL. Auth.js auto-discovers all endpoints. No need to manually configure authorization/token/userinfo URLs.

```typescript
{
  id: "planning-center",
  type: "oidc",
  issuer: "https://api.planningcenteronline.com",
  authorization: { params: { scope: "openid people services" } },
}
```

### PCO OAuth is identity-only

PCO OAuth (for sign-in) and PCO API access use different credentials:
- **OAuth:** `AUTH_PLANNING_CENTER_ID` / `AUTH_PLANNING_CENTER_SECRET` — identifies the user
- **API:** `PCO_API_ID` / `PCO_API_SECRET` — HTTP Basic Auth for background sync

The user's OAuth access token is NOT used for API calls. The sync worker uses a separate Personal Access Token.

### Auth.js v5 + Next.js 16: proxy.ts not middleware.ts

Next.js 16 renamed the middleware file to `proxy.ts`. Auth.js docs may still reference `middleware.ts`. Use:

```typescript
// apps/web/proxy.ts
export { auth as default } from "@mt/auth";
```

### tRPC v11 context pattern

The context factory calls `auth()` (no arguments in v5) and looks up the Person record:

```typescript
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  const person = session?.user?.pcoId
    ? await prisma.person.findFirst({ where: { remoteId: session.user.pcoId, provider: "PCO" } })
    : null;
  return { session, person };
};
```

### Leader procedure pattern

Check the Leader table, not a role field:

```typescript
export const leaderProcedure = protectedProcedure
  .input(z.object({ teamId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const leader = await prisma.leader.findUnique({
      where: { personId_teamId: { personId: ctx.person.id, teamId: input.teamId } },
    });
    if (!leader) throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx: { ...ctx, leader } });
  });
```

## Prevention

- Always check the Next.js version's file naming conventions — they change between major versions
- Keep OAuth identity and API access credentials separate; document which is which in `.env.example`
- Wire auth into tRPC context at initialization, not per-router — avoids duplicated auth checks
