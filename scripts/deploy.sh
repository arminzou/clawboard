#!/bin/bash
set -e

# Resolve deployment directory from workflow env (with fallback for manual runs)
DEPLOY_DIR="${APP_DIR:-$HOME/homelab/docker/clawboard}"

cd "$DEPLOY_DIR"

# Force deployment checkout to match origin/main.
# This avoids merge conflicts when the server has local tracked-file edits.
git fetch origin main
git checkout main
git reset --hard origin/main

# Rebuild and restart the services with Docker Compose
docker compose up -d --build

echo "Deployment successful!"
