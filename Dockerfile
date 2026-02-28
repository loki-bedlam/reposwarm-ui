# Build stage
FROM public.ecr.aws/docker/library/node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the Next.js application
RUN npm run build

# Production stage
FROM public.ecr.aws/docker/library/node:22-alpine AS runner

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Environment variables (can be overridden at runtime)
ENV TEMPORAL_HTTP_URL=http://temporal-alb-internal:8233
ENV TEMPORAL_NAMESPACE=default
ENV TEMPORAL_TASK_QUEUE=investigate-task-queue
ENV AWS_REGION=us-east-1
ENV DYNAMODB_CACHE_TABLE=reposwarm-cache
ENV CODECOMMIT_ENABLED=true
ENV DEFAULT_MODEL=claude-3-opus-20240229
ENV CHUNK_SIZE=10
ENV SLEEP_DURATION=2000
ENV PARALLEL_LIMIT=3
ENV TOKEN_LIMIT=200000
ENV SCHEDULE_EXPRESSION="rate(6 hours)"

# Change ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the application
CMD ["node", "server.js"]