#!/usr/bin/env bash
set -euo pipefail

echo "\n==> Checking Node & npm versions"
node -v || { echo "Please install Node.js (v20+)"; exit 1; }
npm -v || { echo "Please install npm"; exit 1; }

echo "\n==> Installing dependencies (npm install)"
npm install

echo "\n==> Preparing local data directories (./data/files, ./data/pdfs)"
mkdir -p data/files data/pdfs

echo "\n==> Generating Prisma Client"
npx prisma generate

echo "\n==> Synchronizing database schema (prisma db push)"
npx prisma db push

echo "\n==> Starting the application in development mode"
echo "    Open http://localhost:3000 in your browser"
npm run dev

