# Multi-Stage Production Dockerfile for LexusMail
# Stage 1: Build Frontend Assets
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend Application
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Install production dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy compiled backend
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/src/db/schema.sql ./server/dist/db/schema.sql
COPY --from=server-builder /app/server/src/docs/swagger.json ./server/dist/docs/swagger.json

# Copy compiled frontend SPA
COPY --from=client-builder /app/client/dist ./client/dist

# Expose Web Port
EXPOSE 10000

# Default command
CMD ["node", "server/dist/index.js"]
