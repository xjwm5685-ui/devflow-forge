import { BaseAgent, type AgentParams } from "./base-agent"

export class QAAgent extends BaseAgent {
  constructor() {
    super("qa")
  }

  getSystemPrompt(): string {
    return `You are a Senior QA Engineer and Code Reviewer with expertise in testing strategies and code quality.

Your responsibilities:
1. Review code changes for bugs, security issues, and best practices violations
2. Generate comprehensive test cases (unit, integration, e2e)
3. Validate that changes meet the requirements
4. Check for edge cases and error handling
5. Provide actionable feedback for improvements

Output format:
- Start with an overall assessment (PASS/FAIL/NEEDS_CHANGES)
- List any critical issues found
- Provide test code for the changes
- Give a summary of recommendations`
  }

  getDemoResponse(params: AgentParams): string {
    const task = params.input.toLowerCase()

    if (task.includes("auth") || task.includes("jwt")) {
      return `## Code Review: JWT Authentication Implementation

### Overall Assessment: PASS ✅

The implementation follows security best practices and is well-structured. A few minor recommendations below.

### Critical Issues: None

### Minor Issues:

1. **Missing rate limiting on login endpoint** (Low Priority)
   - Recommendation: Add rate limiting to prevent brute force attacks
   - Suggested library: \`express-rate-limit\`

2. **Refresh token store should use Redis** (Medium Priority)
   - Current: In-memory Set (not persistent, not scalable)
   - Recommendation: Use Redis with TTL matching token expiry

### Test Cases Generated:

\`\`\`typescript filename="src/__tests__/auth.test.ts"
import request from 'supertest';
import { app } from '../app';

describe('Authentication', () => {
  describe('POST /api/auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.tokenType).toBe('Bearer');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const { refreshToken } = loginResponse.body;

      // Use refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(refreshToken); // Token rotation
    });

    it('should reject reused refresh tokens', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const { refreshToken } = loginResponse.body;

      // Use refresh token first time
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      // Try to reuse same refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', \`Bearer \${loginResponse.body.accessToken}\`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });
});
\`\`\`

### Security Checklist:
- ✅ Token rotation implemented (refresh tokens are single-use)
- ✅ Separate secrets for access and refresh tokens
- ✅ Proper token type validation
- ✅ Token expiry configured (15m access, 7d refresh)
- ⚠️ Missing rate limiting (recommended)
- ⚠️ In-memory token store (should be Redis in production)

### Recommendations:
1. Add \`express-rate-limit\` to the login endpoint (max 5 attempts per minute per IP)
2. Replace in-memory refresh token store with Redis
3. Add logging for authentication events (login, refresh, logout)
4. Consider adding 2FA support for enhanced security

**Verdict: Ready to merge with minor improvements** ✅`
    }

    return `## Code Review: Code Changes

### Overall Assessment: PASS ✅

The implementation is clean and follows the existing patterns.

### Test Cases:

\`\`\`typescript filename="src/__tests__/users.test.ts"
import request from 'supertest';
import { app } from '../app';

describe('Users API', () => {
  describe('GET /api/users', () => {
    it('should return list of users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should validate input data', async () => {
      const response = await request(app)
        .patch('/api/users/123')
        .set('Authorization', 'Bearer test-token')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });
  });
});
\`\`\`

### Recommendations:
- Add pagination to the list endpoint
- Consider adding field-level authorization
- Add request logging for audit trail`
  }
}

export const qaAgent = new QAAgent()
