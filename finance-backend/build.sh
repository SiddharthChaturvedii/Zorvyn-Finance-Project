#!/usr/bin/env bash
# Exit on error
set -o errexit

npm install
npx prisma generate
npm run build
npx prisma migrate deploy
# Optional: npm run seed (comment out if you don't want to reset prod DB)
