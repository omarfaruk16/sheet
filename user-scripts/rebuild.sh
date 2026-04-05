#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

if [[ ! -f ".env.example.production" ]]; then
	echo "Missing .env.example.production"
	exit 1
fi

echo "Resetting .env from .env.example.production"
rm -f .env
cp .env.example.production .env

echo "Stopping existing containers"
docker compose down --remove-orphans || true

echo "Rebuilding with fresh images and cache disabled"
docker compose build --pull --no-cache
docker compose up -d --remove-orphans

echo "Rebuild complete"
docker compose ps