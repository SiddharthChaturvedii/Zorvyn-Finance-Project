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

# Start the application - running migrations first to support Render Free Tier
CMD npx prisma migrate deploy && npm run start:prod
