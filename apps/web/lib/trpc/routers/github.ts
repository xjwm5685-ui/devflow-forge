import { z } from "zod"
import { router, protectedProcedure } from "../init"

// Mock GitHub data
const MOCK_REPOS = [
  {
    id: 1,
    name: "ecommerce-api",
    fullName: "demo-user/ecommerce-api",
    description: "A RESTful API for an e-commerce platform",
    private: false,
    defaultBranch: "main",
    language: "TypeScript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "task-manager",
    fullName: "demo-user/task-manager",
    description: "Full-stack task management application",
    private: false,
    defaultBranch: "main",
    language: "TypeScript",
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 3,
    name: "ml-pipeline",
    fullName: "demo-user/ml-pipeline",
    description: "Machine learning data pipeline",
    private: true,
    defaultBranch: "main",
    language: "Python",
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
]

const MOCK_FILE_TREE = [
  { path: "src/", type: "dir" as const },
  { path: "src/index.ts", type: "file" as const, size: 1200 },
  { path: "src/app.ts", type: "file" as const, size: 3400 },
  { path: "src/routes/", type: "dir" as const },
  { path: "src/routes/auth.ts", type: "file" as const, size: 2800 },
  { path: "src/routes/users.ts", type: "file" as const, size: 1900 },
  { path: "src/routes/products.ts", type: "file" as const, size: 2200 },
  { path: "src/models/", type: "dir" as const },
  { path: "src/models/user.ts", type: "file" as const, size: 800 },
  { path: "src/models/product.ts", type: "file" as const, size: 600 },
  { path: "src/middleware/", type: "dir" as const },
  { path: "src/middleware/auth.ts", type: "file" as const, size: 1500 },
  { path: "src/middleware/error.ts", type: "file" as const, size: 400 },
  { path: "package.json", type: "file" as const, size: 500 },
  { path: "tsconfig.json", type: "file" as const, size: 300 },
  { path: "README.md", type: "file" as const, size: 2000 },
]

const MOCK_FILE_CONTENTS: Record<string, string> = {
  "src/index.ts": `import express from 'express';
import { app } from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
  "src/app.ts": `import express from 'express';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/users';
import { productRouter } from './routes/products';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

export const app = express();

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', authMiddleware, userRouter);
app.use('/api/products', authMiddleware, productRouter);
app.use(errorHandler);`,
  "src/routes/auth.ts": `import { Router } from 'express';
import jwt from 'jsonwebtoken';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // TODO: Implement proper authentication
  const token = jwt.sign({ email }, process.env.JWT_SECRET!);
  res.json({ token });
});

authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  // TODO: Implement user registration
  res.status(201).json({ message: 'User created' });
});`,
  "package.json": `{
  "name": "ecommerce-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "prisma": "^5.0.0"
  }
}`,
}

export const githubRouter = router({
  repos: protectedProcedure.query(async () => {
    return MOCK_REPOS
  }),

  fileTree: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string().default("main"),
      path: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const prefix = input.path ?? ""
      return MOCK_FILE_TREE.filter((f) =>
        f.path.startsWith(prefix) &&
        f.path.slice(prefix.length).split("/").length <= (prefix ? 2 : 1)
      )
    }),

  fileContent: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      ref: z.string().default("main"),
    }))
    .query(async ({ input }) => {
      return {
        content: MOCK_FILE_CONTENTS[input.path] ?? `// Content of ${input.path}`,
        encoding: "utf-8" as const,
      }
    }),

  branches: protectedProcedure
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async () => {
      return [
        { name: "main", default: true },
        { name: "develop", default: false },
        { name: "feature/auth-refactor", default: false },
      ]
    }),

  createPR: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string(),
      head: z.string(),
      base: z.string().default("main"),
    }))
    .mutation(async ({ input }) => {
      // Simulate PR creation
      return {
        id: Math.floor(Math.random() * 1000),
        number: Math.floor(Math.random() * 100) + 1,
        title: input.title,
        url: `https://github.com/${input.owner}/${input.repo}/pull/${Math.floor(Math.random() * 100) + 1}`,
        state: "open",
      }
    }),
})
