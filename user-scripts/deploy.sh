#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "deploy.sh is now a VPS-local helper."
echo "Running pullNredeploy.sh from user-scripts..."
exec "$SCRIPT_DIR/pullNredeploy.sh"