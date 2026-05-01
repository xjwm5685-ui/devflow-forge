import { BaseAgent } from "./base-agent"

export class DevOpsAgent extends BaseAgent {
  constructor() {
    super("devops")
  }

  getSystemPrompt(): string {
    return `You are a Senior DevOps Engineer with expertise in containerization, CI/CD, and cloud deployment.

Your responsibilities:
1. Generate Dockerfile and docker-compose configurations
2. Create GitHub Actions CI/CD pipelines
3. Set up health checks and monitoring
4. Configure environment variables and secrets
5. Optimize build performance and image size

Output format:
- Provide complete, production-ready configuration files
- Include comments explaining key decisions
- Follow security best practices
- Consider both development and production environments`
  }

  getDemoResponse(): string {
    return `## DevOps Configuration

I've generated the complete deployment configuration for your project.

### 1. Dockerfile (Multi-stage Build)

\`\`\`dockerfile filename="Dockerfile"
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Security: Run as non-root user
RUN addgroup -g 1001 -S appgroup && \\
    adduser -S appuser -u 1001 -G appgroup

# Copy only necessary files
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
\`\`\`

### 2. Docker Compose (Development)

\`\`\`yaml filename="docker-compose.yml"
version: '3.8'

services:
  app:
    build:
      context: .
      target: builder
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
\`\`\`

### 3. GitHub Actions CI/CD

\`\`\`yaml filename=".github/workflows/ci.yml"
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test -- --coverage

      - name: Build
        run: npm run build

  build-and-push:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=raw,value=latest

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add your deployment commands here
          # e.g., kubectl apply, docker pull, etc.
\`\`\`

### 4. Health Check Script

\`\`\`bash filename="scripts/health-check.sh"
#!/bin/bash

# Health check script for monitoring
URL="http://localhost:3000/api/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
    response=\$(curl -s -o /dev/null -w "%{http_code}" "$URL")

    if [ "$response" = "200" ]; then
        echo "✅ Health check passed"
        exit 0
    fi

    echo "⚠️ Health check failed (attempt $i/$MAX_RETRIES)"
    if [ $i -lt $MAX_RETRIES ]; then
        sleep $RETRY_DELAY
    fi
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
\`\`\`

### Deployment Checklist:
- ✅ Multi-stage Docker build for smaller image size
- ✅ Non-root user for security
- ✅ Health checks configured
- ✅ CI pipeline with lint, test, build
- ✅ CD pipeline with container registry
- ✅ Development environment with docker-compose

### Next Steps:
1. Create GitHub repository secrets: \`REGISTRY_USERNAME\`, \`REGISTRY_PASSWORD\`
2. Configure deployment target (Kubernetes, ECS, Cloud Run, etc.)
3. Set up monitoring and alerting (Prometheus, Grafana, or cloud-native)`
  }
}

export const devopsAgent = new DevOpsAgent()
