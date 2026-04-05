#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

log() {
	printf '[pullNredeploy] %s\n' "$1"
}

require_file() {
	local file="$1"
	if [[ ! -f "$file" ]]; then
		echo "Missing required file: $file"
		exit 1
	fi
}

main() {
	cd "$PROJECT_DIR"

	require_file "$PROJECT_DIR/.env.example.production"
	require_file "$PROJECT_DIR/docker-compose.yml"

	log "Stopping existing containers"
	docker compose down --remove-orphans || true

	log "Updating git checkout"
	git fetch --all --prune
	git reset --hard "origin/${DEPLOY_BRANCH}"

	log "Resetting .env from .env.example.production"
	rm -f "$PROJECT_DIR/.env"
	cp "$PROJECT_DIR/.env.example.production" "$PROJECT_DIR/.env"

	log "Rebuilding and starting containers"
	docker compose build --pull --no-cache
	docker compose up -d --remove-orphans

	log "Deployment completed"
	docker compose ps
}

main "$@"