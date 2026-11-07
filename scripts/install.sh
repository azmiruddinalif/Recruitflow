#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "  RecruitFlow — Commercial Self-Hosted Installer (Linux/macOS)"
echo "============================================================"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js (>=20.x) is required but not installed."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "[1/5] Creating .env from .env.example..."
  cp .env.example .env
else
  echo "[1/5] Existing .env detected."
fi

echo "[2/5] Installing workspace dependencies..."
npm install

echo "[3/5] Generating Prisma Client..."
npm run db:generate

echo "[4/5] Building shared workspace packages..."
npm run build:packages

echo "[5/5] Pushing database schema & seeding demo data (if PostgreSQL is reachable)..."
if npm run db:push && npm run db:seed; then
  echo "[SUCCESS] Database migrated and seeded."
else
  echo "[WARN] PostgreSQL database was not reachable at DATABASE_URL. Run 'npm run db:push && npm run db:seed' once PostgreSQL is running."
fi

echo ""
echo "Installation complete! Start RecruitFlow with: npm run dev"

