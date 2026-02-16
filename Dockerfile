# --- Stage 1: Build Frontend ---
FROM node:22 AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Pass the API key to Vite during build so it's baked into the static JS
ARG VITE_CLAWBOARD_API_KEY
ENV VITE_CLAWBOARD_API_KEY=$VITE_CLAWBOARD_API_KEY
RUN npm run build

# --- Stage 2: Final Image ---
FROM node:22
WORKDIR /app

# Copy ONLY package files first
COPY backend/package*.json ./backend/

# FORCE a fresh compile by ensuring node_modules is clean inside the container
# and skipping the build context's node_modules if it exists.
RUN cd backend && rm -rf node_modules && npm install --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Build backend (TypeScript -> dist)
RUN cd backend && npm run build

# Copy frontend build from Stage 1
RUN mkdir -p frontend/dist
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/data
ENV CLAWBOARD_DB_PATH=/app/data/tasks.db
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001
CMD ["node", "backend/dist/server.js"]
