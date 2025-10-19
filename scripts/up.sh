#!/usr/bin/env bash
set -euo pipefail

echo "\n==> Checking Node & npm versions"
node -v || { echo "Please install Node.js (v20+)"; exit 1; }
npm -v || { echo "Please install npm"; exit 1; }

echo "\n==> Installing dependencies (npm install)"
npm install

echo "\n==> Preparing local PDF cache (./data/pdfs)"
mkdir -p data/pdfs

if command -v supabase >/dev/null 2>&1; then
  echo "\n==> Resetting local Supabase database (supabase db reset --force)"
  supabase db reset --force || echo "Supabase reset failed—ensure Docker is running and try manually."
else
  echo "\n==> Supabase CLI not detected; install from https://supabase.com/docs/guides/cli and run 'supabase start' in another terminal."
fi

echo "\n==> Starting the application in development mode"
echo "    Open http://localhost:3000 in your browser"
npm run dev
