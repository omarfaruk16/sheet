#!/bin/bash

# Script to rebuild Docker containers with cache clearing
# This ensures latest frontend changes are always reflected

set -e

echo "🔄 Clearing Docker build cache..."
docker compose rm -f frontend

echo "🏗️  Rebuilding containers with --build flag..."
docker compose up --build -d

echo "✅ Containers rebuilt and started!"
echo ""
echo "Available services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend: http://localhost:5000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Nginx: http://localhost:80"
echo ""
echo "View logs with: docker compose logs -f"

