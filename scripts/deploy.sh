#!/bin/bash
set -e

# ============================================================
# LumieClaw Backend - One-click Deploy
# 前提: 已运行 setup-server.sh, 已 git clone, 已编辑 .env
# 使用: chmod +x deploy.sh && ./deploy.sh
# ============================================================

echo "=========================================="
echo "  LumieClaw Backend - Deploy"
echo "=========================================="

# Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Copy from .env.example and edit it first:"
  echo "  cp .env.example .env && nano .env"
  exit 1
fi

# ─── Step 1: Build & Start Docker containers ────────────────

echo "[1/4] Building and starting Docker containers..."
docker compose -f docker-compose.prod.yaml up -d --build
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# ─── Step 2: Run database migrations ────────────────────────

echo "[2/4] Running database migrations..."
# Install deps locally for migration CLI (TypeORM CLI needs ts-node)
npm install
npm run migration:run
echo "Migrations completed."

# ─── Step 3: Seed initial data ───────────────────────────────

echo "[3/4] Seeding initial data..."
npm run seed:run
echo "Seeding completed."

# ─── Step 4: Verify ─────────────────────────────────────────

echo "[4/4] Verifying deployment..."
sleep 3

API_URL="http://localhost:${APP_PORT:-3000}/api"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "=========================================="
  echo "  Deployment Successful!"
  echo "=========================================="
  echo ""
  echo "  API:     $API_URL"
  echo "  Swagger: http://localhost:${APP_PORT:-3000}/docs"
  echo ""
  echo "  Default admin account:"
  echo "    Email:    admin@example.com"
  echo "    Password: secret"
  echo "    (CHANGE THIS IMMEDIATELY!)"
  echo ""
  echo "  Useful commands:"
  echo "    docker compose -f docker-compose.prod.yaml logs -f api"
  echo "    docker compose -f docker-compose.prod.yaml restart api"
  echo "    docker compose -f docker-compose.prod.yaml down"
  echo ""
else
  echo ""
  echo "WARNING: API returned HTTP $HTTP_CODE"
  echo "Check logs: docker compose -f docker-compose.prod.yaml logs api"
  echo ""
fi
