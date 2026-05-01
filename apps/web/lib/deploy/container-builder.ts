import { execFile } from "child_process"
import { promisify } from "util"
import { writeFile, mkdir, cp } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

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
  } catch {
    return false
  }
}

export async function buildImage(params: {
  dockerfile: string
  context: string
  tag: string
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
  }
}

export async function runContainer(params: {
  imageTag: string
  port?: number
  env?: Record<string, string>
}): Promise<{ containerId: string; url: string } | null> {
  const { imageTag, port = 3000, env = {} } = params

  try {
    const hasDocker = await isDockerAvailable()
    if (!hasDocker) return null

    const args = ["run", "-d", "-p", `${port}:${port}`]
    for (const [k, v] of Object.entries(env)) {
      args.push("-e", `${k}=${v}`)
    }
    args.push(imageTag)

    const { stdout } = await execFileAsync("docker", args, { timeout: 30000 })
    return { containerId: stdout.trim(), url: `http://localhost:${port}` }
  } catch {
    return null
  }
}
