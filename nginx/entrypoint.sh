#!/bin/sh
# entrypoint.sh - Substitute environment variables in nginx.conf and start nginx

set -e

echo "[nginx] Setting up configuration with environment variables..."

# Set defaults if environment variables are not provided
export FRONTEND_CONTAINER_PORT="${FRONTEND_CONTAINER_PORT:-3000}"
export BACKEND_CONTAINER_PORT="${BACKEND_CONTAINER_PORT:-5000}"

echo "[nginx] FRONTEND_CONTAINER_PORT=${FRONTEND_CONTAINER_PORT}"
echo "[nginx] BACKEND_CONTAINER_PORT=${BACKEND_CONTAINER_PORT}"

# Create the config directory if it doesn't exist
mkdir -p /etc/nginx

# Use envsubst to replace variables in the template (now using simple $VAR syntax)
envsubst '${FRONTEND_CONTAINER_PORT},${BACKEND_CONTAINER_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "[nginx] Configuration loaded successfully"
echo "[nginx] Starting Nginx..."
exec nginx -g "daemon off;"
