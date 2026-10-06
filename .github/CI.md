# CI validation boundary

CI runs the existing API behavior tests, web TypeScript and ESLint checks, and
worker and Next.js builds using the locked pnpm version and Node 24. Prisma
client generation reads the checked-in schema and does not connect to a database.
Turbo tasks use a local cache and force execution.

No environment files, credentials, account sync, or database migrations are used.
Next.js downloads Google fonts while building. Its routes are dynamically rendered,
so a successful build does not validate runtime environment configuration or
authenticated database behavior. Those require a separate test environment.
