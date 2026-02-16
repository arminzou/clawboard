#!/bin/bash
set -e

# Navigate to the Clawboard project directory on the homelab
# This path needs to be configured correctly on the runner/server
cd ~/homelab/docker/clawboard

# Pull the latest changes from the git repository
git pull origin main

# Rebuild and restart the services with Docker Compose
docker-compose up -d --build

echo "Deployment successful!"
