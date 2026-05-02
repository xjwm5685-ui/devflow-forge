// Demo / mock data used when GitHub is not configured.

export const MOCK_FILES = [
  { path: "src/index.ts", content: 'import express from "express";\nconst app = express();\napp.listen(3000);' },
  { path: "src/app.ts", content: 'import express from "express";\nexport const app = express();\napp.use(express.json());' },
  { path: "src/routes/auth.ts", content: 'import { Router } from "express";\nimport jwt from "jsonwebtoken";\nexport const authRouter = Router();\n\nauthRouter.post("/login", (req, res) => {\n  const token = jwt.sign({ id: "user" }, "secret");\n  res.json({ token });\n});' },
  { path: "src/middleware/auth.ts", content: 'export function authMiddleware(req, res, next) {\n  const token = req.headers.authorization;\n  if (!token) return res.status(401).json({ error: "Unauthorized" });\n  next();\n}' },
  { path: "package.json", content: '{\n  "name": "ecommerce-api",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "tsx watch src/index.ts",\n    "build": "tsc",\n    "test": "vitest"\n  }\n}' },
]

export const MOCK_REPOS = [
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

export const MOCK_FILE_TREE = [
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

export const MOCK_FILE_CONTENTS: Record<string, string> = {
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
