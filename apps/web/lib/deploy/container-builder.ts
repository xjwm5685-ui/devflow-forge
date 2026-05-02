import { execFile } from "child_process"
import { promisify } from "util"
import { writeFile, mkdir, cp, rm } from "fs/promises"
import { dirname, join, resolve } from "path"
import { tmpdir } from "os"
import { createServer } from "net"

const execFileAsync = promisify(execFile)

interface BuildResult {
  success: boolean
  imageTag?: string
  logs: string[]
  error?: string
}

export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync("docker", ["info"], { timeout: 5000 })
    return true
  } catch (err) {
    console.warn("[ContainerBuilder] Docker is not available:", err)
    return false
  }
}

export async function buildImage(params: {
  dockerfile: string
  context: string
  tag: string
  files?: Array<{ path: string; content: string }>
  onLog?: (line: string) => void
}): Promise<BuildResult> {
  const { dockerfile, tag, onLog } = params
  const logs: string[] = []

  const buildDir = join(tmpdir(), "devflow-build-" + Date.now())
  await mkdir(buildDir, { recursive: true })
  await writeFile(join(buildDir, "Dockerfile"), dockerfile)

  try {
    const hasDocker = await isDockerAvailable()
    if (!hasDocker) {
      return {
        success: false,
        logs: ["Docker is not available. Install Docker to build container images."],
        error: "Docker not found",
      }
    }

    const log = (msg: string) => {
      logs.push(msg)
      onLog?.(msg)
    }

    log(`Building Docker image: ${tag}`)

    if (params.files) {
      for (const file of params.files) {
        const target = join(buildDir, file.path)
        const resolved = resolve(target)
        if (!resolved.startsWith(resolve(buildDir))) {
          throw new Error(`Path traversal detected: ${file.path}`)
        }
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, file.content)
      }
    } else {
      // Cross-platform file copy, excluding sensitive files
      await cp(params.context, buildDir, {
        recursive: true,
        filter: (src) => {
          const name = src.split(/[/\\]/).pop() ?? ""
          const excluded = [
            "node_modules", ".next", ".git", ".env", ".env.local",
            ".env.production", ".settings.json", "*.pem", "*.key",
            "*.p12", "id_rsa", "id_ed25519",
          ]
          return !excluded.some((pattern) =>
            name === pattern || name.endsWith(pattern.replace("*", ""))
          )
        },
      }).catch(() => {})
    }

    // Use execFile (no shell) to prevent command injection
    const { stdout, stderr } = await execFileAsync("docker", [
      "build",
      "-t", tag,
      "-f", join(buildDir, "Dockerfile"),
      buildDir,
    ], { timeout: 300000 })

    if (stdout) log(stdout)
    if (stderr) log(stderr)

    log(`Image built successfully: ${tag}`)
    return { success: true, imageTag: tag, logs }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error"
    logs.push(`Build failed: ${errMsg}`)
    return { success: false, logs, error: errMsg }
  } finally {
    await rm(buildDir, { recursive: true, force: true }).catch(() => {})
  }
}

const HOST_PORT_MIN = 41000
const HOST_PORT_MAX = 41999

async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.unref()
    server.once("error", () => resolve(false))
    server.listen({ host: "0.0.0.0", port }, () => {
      server.close(() => resolve(true))
    })
  })
}

async function pickFreeHostPort(): Promise<number | null> {
  for (let attempts = 0; attempts < 25; attempts++) {
    const port = HOST_PORT_MIN + Math.floor(Math.random() * (HOST_PORT_MAX - HOST_PORT_MIN + 1))
    if (await isPortFree(port)) return port
  }
  return null
}

export async function removeContainer(name: string): Promise<void> {
  await execFileAsync("docker", ["rm", "-f", name], { timeout: 15000 }).catch(() => {})
}

export async function runContainer(params: {
  imageTag: string
  /** Container port the image listens on. Defaults to 3000. */
  port?: number
  /** Stable container name; existing container with this name is removed first. */
  name: string
  env?: Record<string, string>
  labels?: Record<string, string>
}): Promise<{ containerId: string; url: string; hostPort: number } | null> {
  const { imageTag, port = 3000, name, env = {}, labels = {} } = params

  try {
    const hasDocker = await isDockerAvailable()
    if (!hasDocker) return null

    await removeContainer(name)

    const hostPort = await pickFreeHostPort()
    if (!hostPort) return null

    const args = [
      "run", "-d",
      "--name", name,
      "--restart", "unless-stopped",
      "-p", `${hostPort}:${port}`,
    ]
    for (const [k, v] of Object.entries(labels)) {
      args.push("--label", `${k}=${v}`)
    }
    for (const [k, v] of Object.entries(env)) {
      args.push("-e", `${k}=${v}`)
    }
    args.push(imageTag)

    const { stdout } = await execFileAsync("docker", args, { timeout: 30000 })
    return {
      containerId: stdout.trim(),
      hostPort,
      url: `http://localhost:${hostPort}`,
    }
  } catch (err) {
    console.error("[ContainerBuilder] Failed to run container:", err)
    return null
  }
}
