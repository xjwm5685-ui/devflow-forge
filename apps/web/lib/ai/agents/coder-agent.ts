import { BaseAgent, type AgentParams } from "./base-agent"

export class CoderAgent extends BaseAgent {
  constructor() {
    super("coder")
  }

  getSystemPrompt(): string {
    return `You are an Expert Software Engineer with deep knowledge of modern development practices.

Your responsibilities:
1. Implement code changes based on the architect's plan
2. Follow existing code patterns and conventions
3. Write clean, maintainable, and well-structured code
4. Add appropriate error handling
5. Include TypeScript types where applicable

Output format:
- Show the complete file content for each modified/created file
- Use code blocks with filename annotations
- Explain the reasoning behind each significant change
- Highlight any assumptions made`
  }

  getDemoResponse(params: AgentParams): string {
    const task = params.input.toLowerCase()

    if (task.includes("auth") || task.includes("jwt")) {
      return `## Implementation: JWT Authentication Module

Based on the architect's plan, I've implemented the JWT authentication system. Here are the changes:

### 1. JWT Utility Module (NEW FILE)

\`\`\`typescript filename="src/utils/jwt.ts"
import jwt from 'jsonwebtoken';

const config = {
  accessTokenSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
};

export interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export function generateTokenPair(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'access' } as TokenPayload,
    config.accessTokenSecret,
    { expiresIn: config.accessTokenExpiry }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' } as TokenPayload,
    config.refreshTokenSecret,
    { expiresIn: config.refreshTokenExpiry }
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.accessTokenSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.refreshTokenSecret) as TokenPayload;
}
\`\`\`

### 2. Updated Auth Middleware

\`\`\`typescript filename="src/middleware/auth.ts"
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token required. Use Authorization: Bearer <token>',
    });
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    req.userId = payload.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
\`\`\`

### 3. Updated Auth Routes

\`\`\`typescript filename="src/routes/auth.ts"
import { Router } from 'express';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';

export const authRouter = Router();

// In-memory refresh token store (use Redis in production)
const refreshTokenStore = new Set<string>();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // TODO: Validate credentials against database
  // For demo, assume user ID is 'user-123'
  const userId = 'user-123';

  const tokens = generateTokenPair(userId);
  refreshTokenStore.add(tokens.refreshToken);

  res.json({
    ...tokens,
    tokenType: 'Bearer',
    expiresIn: 900, // 15 minutes in seconds
  });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || !refreshTokenStore.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Rotate refresh token
    refreshTokenStore.delete(refreshToken);
    const tokens = generateTokenPair(payload.userId);
    refreshTokenStore.add(tokens.refreshToken);

    res.json(tokens);
  } catch (error) {
    refreshTokenStore.delete(refreshToken);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

authRouter.post('/logout', authMiddleware, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    refreshTokenStore.delete(refreshToken);
  }
  res.json({ message: 'Logged out successfully' });
});

authRouter.get('/me', authMiddleware, async (req, res) => {
  // TODO: Fetch user from database
  res.json({
    id: req.userId,
    email: 'user@example.com',
    name: 'Demo User',
  });
});
\`\`\`

### Changes Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| \`src/utils/jwt.ts\` | Created | +45 |
| \`src/middleware/auth.ts\` | Modified | +18, -12 |
| \`src/routes/auth.ts\` | Modified | +65, -15 |

### Notes
- The refresh token store uses an in-memory Set for demo purposes. In production, use Redis with TTL.
- Token rotation is implemented for security - each refresh token can only be used once.
- The old session-based auth code has been removed. If you need backward compatibility, let me know.`
    }

    return `## Implementation: Code Changes

I've implemented the requested changes following the existing code patterns.

### Changes Made

\`\`\`typescript filename="src/routes/users.ts"
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

export const userRouter = Router();

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

userRouter.get('/', authMiddleware, async (req, res) => {
  // TODO: Implement pagination
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
  });
  res.json({ users, total: users.length });
});

userRouter.get('/:id', authMiddleware, async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

userRouter.patch('/:id', authMiddleware, async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const user = await db.user.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json(user);
});
\`\`\`

### Implementation Notes
- Added Zod validation for input data
- Implemented proper error responses with status codes
- Used Prisma select to exclude sensitive fields
- All endpoints require authentication via middleware`
  }
}

export const coderAgent = new CoderAgent()
