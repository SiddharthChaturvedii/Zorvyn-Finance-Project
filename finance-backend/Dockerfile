# Build stage
FROM node:20-alpine AS builder

# Install system dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Compile seed file for production (ESM with CommonJS interop)
RUN npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --module commonjs --skipLibCheck --ignoreConfig

# Production stage
FROM node:20-alpine AS runner

# Install system dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma/

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the application - running migrations and compiled seed first for Render Free Tier
CMD npx prisma migrate deploy && node dist/prisma/seed.js && npm run start:prod
