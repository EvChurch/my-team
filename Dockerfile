FROM node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d

WORKDIR /app
COPY scripts/update-security-ca.sh ./scripts/update-security-ca.sh
RUN sh scripts/update-security-ca.sh
ENV SSL_CERT_DIR=/usr/local/share/security-ca/certs
RUN npm install --global pnpm@10.32.1 --no-audit --no-fund
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
# These public build identifiers preserve the existing version display.
ARG RAILWAY_GIT_COMMIT_SHA
ARG RAILWAY_ENVIRONMENT
# Static builds/generation use no production credentials or database connection.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:1/build pnpm --filter @mt/api db:generate
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:1/build pnpm --filter @mt/web build \
    && pnpm --filter worker build

ENV NODE_ENV=production
# Each service retains its own Railway start command and deployment lifecycle.
CMD ["node", "apps/web/.next/standalone/apps/web/server.js"]
