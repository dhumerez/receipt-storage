#!/bin/sh
set -e

echo "Running database migrations..."
npm run db:migrate

echo "Starting API server..."
exec node dist/server.js
