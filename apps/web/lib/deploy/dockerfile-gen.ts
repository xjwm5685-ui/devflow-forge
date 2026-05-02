// Dockerfile generator - detects project type and generates appropriate Dockerfile

interface ProjectFiles {
  path: string
  content: string
}

type ProjectType = "node" | "nextjs" | "python" | "go" | "unknown"

export interface DockerfileResult {
  dockerfile: string
  /** Container port the generated Dockerfile listens on. */
  port: number
}

function detectProjectType(files: ProjectFiles[]): ProjectType {
  const paths = files.map((f) => f.path)

  if (paths.some((p) => p === "package.json")) {
    const pkgFile = files.find((f) => f.path === "package.json")
    if (pkgFile) {
      try {
        const content = JSON.parse(pkgFile.content)
        if (content.dependencies?.next || content.devDependencies?.next) return "nextjs"
      } catch {
        // Fall through to node detection
      }
    }
    return "node"
  }
  if (paths.some((p) => p === "requirements.txt" || p === "pyproject.toml")) return "python"
  if (paths.some((p) => p === "go.mod")) return "go"

  const pkg = files.find((f) => f.path === "package.json")
  if (pkg) {
    try {
      const content = JSON.parse(pkg.content)
      if (content.dependencies || content.devDependencies) return "node"
    } catch (err) {
      console.warn("[DockerfileGen] Failed to parse package.json for language detection:", err)
    }
  }

  return "unknown"
}

function detectPackageManager(files: ProjectFiles[]): "npm" | "yarn" | "pnpm" {
  if (files.some((f) => f.path === "pnpm-lock.yaml")) return "pnpm"
  if (files.some((f) => f.path === "yarn.lock")) return "yarn"
  return "npm"
}

function hasScript(files: ProjectFiles[], script: string): boolean {
  const pkg = files.find((f) => f.path === "package.json")
  if (!pkg) return false
  try {
    const content = JSON.parse(pkg.content)
    return !!content.scripts?.[script]
  } catch (err) {
    console.warn("[DockerfileGen] Failed to parse package.json for script detection:", err)
    return false
  }
}

export function generateDockerfile(files: ProjectFiles[]): DockerfileResult {
  const type = detectProjectType(files)

  switch (type) {
    case "nextjs":
      return { dockerfile: generateNextJsDockerfile(files), port: 3000 }
    case "node":
      return { dockerfile: generateNodeDockerfile(files), port: 3000 }
    case "python":
      return { dockerfile: generatePythonDockerfile(), port: 8000 }
    case "go":
      return { dockerfile: generateGoDockerfile(), port: 8080 }
    default:
      return { dockerfile: generateGenericDockerfile(), port: 8080 }
  }
}

function generateNextJsDockerfile(files: ProjectFiles[]): string {
  const pm = detectPackageManager(files)

  const installCmd = pm === "pnpm" ? "RUN corepack enable pnpm && pnpm install --frozen-lockfile" :
                     pm === "yarn" ? "yarn install --frozen-lockfile" :
                     "npm ci"

  return `# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ${pm === "yarn" ? "yarn.lock" : pm === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json"}* ./
${installCmd}

COPY . .
RUN ${pm} run build

# ---- Production stage ----
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \\
    adduser -S appuser -u 1001 -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/next.config.ts ./
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static

ENV NODE_ENV=production
ENV PORT=3000

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
`
}

function generateNodeDockerfile(files: ProjectFiles[]): string {
  const pm = detectPackageManager(files)
  const hasBuild = hasScript(files, "build")

  const installCmd = pm === "pnpm" ? "RUN npm install -g pnpm && pnpm install --frozen-lockfile" :
                     pm === "yarn" ? "yarn install --frozen-lockfile" :
                     "npm ci"

  const buildCmd = hasBuild ? `RUN ${pm === "pnpm" ? "pnpm" : pm} run build` : ""

  return `# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ${pm === "yarn" ? "yarn.lock" : pm === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json"}* ./
${installCmd}

COPY . .
${buildCmd}

# ---- Production stage ----
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \\
    adduser -S appuser -u 1001 -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
${hasBuild ? "COPY --from=builder --chown=appuser:appgroup /app/dist ./dist" : "COPY --from=builder --chown=appuser:appgroup /app/src ./src"}

ENV NODE_ENV=production
ENV PORT=3000

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "${hasBuild ? "dist/index.js" : "src/index.js"}"]
`
}

function generatePythonDockerfile(): string {
  return `FROM python:3.12-slim AS builder
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS production
WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

RUN useradd -m appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s \\
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`
}

function generateGoDockerfile(): string {
  return `FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

FROM alpine:3.19 AS production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \\
    adduser -S appuser -u 1001 -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/server .

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \\
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./server"]
`
}

function generateGenericDockerfile(): string {
  return `FROM ubuntu:22.04
WORKDIR /app

COPY . .

EXPOSE 8080

CMD ["echo", "Please customize this Dockerfile for your project"]
`
}
