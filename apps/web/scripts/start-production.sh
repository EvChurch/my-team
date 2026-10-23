#!/bin/sh
# Railway Docker start overrides use exec form; evaluate asset setup here.
set -eu
web_root=apps/web/.next/standalone/apps/web
mkdir -p "$web_root/public" "$web_root/.next/static"
if [ -d apps/web/public ]; then
  cp -r apps/web/public/. "$web_root/public"
fi
cp -r apps/web/.next/static/. "$web_root/.next/static"
HOSTNAME=0.0.0.0
export HOSTNAME
exec node "$web_root/server.js"
