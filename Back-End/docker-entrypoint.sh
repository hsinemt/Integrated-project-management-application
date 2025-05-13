#!/bin/sh
set -e

# Print environment for debugging (optional, can be removed in production)
echo "Starting application with NODE_ENV=$NODE_ENV"

# Execute the command passed to docker run (or the default command from CMD)
exec "$@"
