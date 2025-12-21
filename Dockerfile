# Build Stage
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies for building
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production Stage - Distroless for maximum security
FROM gcr.io/distroless/nodejs24-debian12 AS runtime

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

# Copy build output from build stage
# Distroless images have minimal standard locations, app in /app is fine
COPY --from=build /app/.output ./.output

# Distroless nodejs images run as 'nonroot' user (UID 65532) by default
USER nonroot

EXPOSE 10000

# Start the application using the standalone Nitro server
CMD [".output/server/index.mjs"]
