#!/bin/sh
set -e

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Running seeds..."
npx tsx prisma/seed.ts

echo "▶ Starting server..."
exec node server.js
