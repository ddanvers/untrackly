# ARG for Node version to easily update it
ARG NODE_VERSION=22

# -----------------------------------------------------------------------------
# Stage 1: Base
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies required for runtime (if any)
# better-sqlite3 might need these on somealpine versions, but usually fine.
# We keep base clean.

# -----------------------------------------------------------------------------
# Stage 2: Dependencies
# -----------------------------------------------------------------------------
FROM base AS deps

# Install build tools required for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
# We use 'npm install' instead of 'ci' to avoid cross-platform lockfile issues
# with optional dependencies (like @oxc-minify)
RUN rm -f package-lock.json && npm install

# -----------------------------------------------------------------------------
# Stage 3: Build
# -----------------------------------------------------------------------------
FROM base AS build

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy app source
COPY . .

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 4: Production
# -----------------------------------------------------------------------------
FROM base AS runtime

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

# Install minimal runtime libs if needed (often not for pure node-alpine)
# ensure we use the 'node' user defined in the base image
# Create/fix permissions for the working directory so the node user can write the DB
RUN chown node:node /app

USER node

# Copy build output
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/server/database/migrations ./migrations

# Expose the port
EXPOSE 10000

# Start the application
CMD ["node", ".output/server/index.mjs"]
