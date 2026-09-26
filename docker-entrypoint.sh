#!/bin/sh
set -e

# Apply pending schema migrations before serving traffic.
node node_modules/prisma/build/index.js migrate deploy

# Hand off to the real server so it receives signals.
exec "$@"