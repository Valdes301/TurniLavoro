# Multi-stage build optimized for Raspberry Pi (ARM64/x64) and Docker environments
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN rm -f package-lock.json && npm install

# Copy application source and build bundle
COPY . .
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN rm -f package-lock.json && npm install --omit=dev

# Copy built server bundle and static frontend assets
COPY --from=builder /app/dist ./dist

# Create persistent data directory
RUN mkdir -p /app/data

# Expose port 3000
EXPOSE 3000

# Start server
CMD ["node", "dist/server.cjs"]
