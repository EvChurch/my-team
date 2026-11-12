FROM node:22.23.5-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee

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
CMD ["sh", "apps/web/scripts/start-production.sh"]
