import { BaseAgent, type AgentParams } from "./base-agent"

export class ArchitectAgent extends BaseAgent {
  constructor() {
    super("architect")
  }

  getSystemPrompt(): string {
    return `You are a Senior Software Architect with deep expertise in system design, design patterns, and best practices.

Your responsibilities:
1. Analyze the existing codebase architecture and patterns
2. Design a detailed implementation plan for the given task
3. Identify affected files and potential risks
4. Define API contracts and data models
5. Consider scalability, maintainability, and security implications

Output format:
- Start with a brief analysis of the current architecture
- List the files that need to be modified or created
- Provide a step-by-step implementation plan
- Highlight potential risks and mitigation strategies
- Include any new API definitions or data models needed`
  }

  getDemoResponse(params: AgentParams): string {
    const task = params.input.toLowerCase()

    if (task.includes("auth") || task.includes("jwt") || task.includes("login")) {
      return `## Architecture Analysis: Authentication Module Refactoring

### Current State Analysis
The existing authentication system uses session-based auth with Express middleware. The auth module is located in \`src/middleware/auth.ts\` and \`src/routes/auth.ts\`.

**Current Issues:**
- Session storage requires server-side state (not scalable)
- No token refresh mechanism
- Missing rate limiting on auth endpoints

### Proposed Architecture

#### Files to Modify:
1. \`src/middleware/auth.ts\` - Replace session validation with JWT verification
2. \`src/routes/auth.ts\` - Add JWT token generation and refresh endpoints
3. \`src/models/user.ts\` - Add refresh token storage field
4. \`src/utils/jwt.ts\` - NEW: JWT utility functions
5. \`src/config/auth.ts\` - NEW: Auth configuration constants

#### Implementation Plan:

**Step 1: Create JWT Utility Module (\`src/utils/jwt.ts\`)**
\`\`\`typescript
// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId, type: 'access' }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): { userId: string } {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as { userId: string };
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as { userId: string };
}
\`\`\`

**Step 2: Update Auth Middleware**
\`\`\`typescript
// src/middleware/auth.ts
import { verifyAccessToken } from '../utils/jwt';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const token = authHeader.slice(7);
    const { userId } = verifyAccessToken(token);
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
\`\`\`

**Step 3: Update Auth Routes**
- Add \`POST /api/auth/refresh\` endpoint
- Modify \`POST /api/auth/login\` to return both access and refresh tokens
- Add \`POST /api/auth/logout\` to invalidate refresh token

### Risk Assessment
- **High Risk**: All existing API consumers need to update to use Bearer tokens
- **Mitigation**: Implement a grace period where both session and JWT auth are accepted

### Estimated Impact
- 5 files modified/created
- ~200 lines of new code
- Breaking change for existing API consumers (mitigated with grace period)`
    }

    if (task.includes("deploy") || task.includes("docker") || task.includes("ci/cd")) {
      return `## Architecture Analysis: Deployment Pipeline Setup

### Current State Analysis
The project has no deployment configuration. It's a Node.js Express application that needs containerization and CI/CD.

### Proposed Architecture

#### Files to Create:
1. \`Dockerfile\` - Multi-stage build for production
2. \`docker-compose.yml\` - Local development environment
3. \`.github/workflows/ci.yml\` - GitHub Actions CI pipeline
4. \`.github/workflows/deploy.yml\` - Deployment pipeline
5. \`scripts/health-check.sh\` - Health check script

#### Implementation Plan:

**Step 1: Dockerfile (\`Dockerfile\`)**
\`\`\`dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
\`\`\`

**Step 2: GitHub Actions CI (\`.github/workflows/ci.yml\`)**
\`\`\`yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
\`\`\`

### Risk Assessment
- **Low Risk**: Standard containerization pattern
- **Medium Risk**: CI/CD secrets need to be configured in GitHub

### Estimated Impact
- 5 new files
- ~150 lines of configuration
- Zero impact on existing code`
    }

    return `## Architecture Analysis: Code Refactoring

### Current State Analysis
I've analyzed the codebase structure and identified the key patterns and components. The project follows a modular architecture with clear separation of concerns.

### Proposed Changes

#### Files to Modify:
1. \`src/index.ts\` - Entry point optimizations
2. \`src/app.ts\` - Application configuration updates
3. \`src/routes/\` - Route handler improvements

#### Implementation Plan:

**Step 1: Code Structure Improvements**
- Extract shared utilities into a dedicated module
- Implement proper error handling patterns
- Add input validation using Zod schemas

**Step 2: Performance Optimizations**
- Add response caching for frequently accessed endpoints
- Implement request rate limiting
- Optimize database queries with proper indexing

**Step 3: Testing Strategy**
- Add unit tests for all route handlers
- Implement integration tests for critical paths
- Set up test fixtures and factories

### Risk Assessment
- **Low Risk**: Incremental improvements with backward compatibility
- **Mitigation**: Each change can be deployed independently

### Estimated Impact
- 3-5 files modified
- ~100 lines of refactored code
- Improved maintainability and test coverage`
  }
}

export const architectAgent = new ArchitectAgent()
