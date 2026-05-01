import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

const execAsync = promisify(exec)

interface BuildResult {
  success: boolean
  imageTag?: string
  logs: string[]
  error?: string
}

export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker info", { timeout: 5000 })
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

  // Write Dockerfile to temp directory
  const buildDir = join(tmpdir(), "devflow-build-" + Date.now())
  await mkdir(buildDir, { recursive: true })
  await writeFile(join(buildDir, "Dockerfile"), dockerfile)

  try {
    // Check Docker availability
    const hasDocker = await isDockerAvailable()
    if (!hasDocker) {
      return {
        success: false,
        logs: ["Docker is not available. Install Docker to build container images."],
        error: "Docker not found",
      }
    }

    // Build the image
    const log = (msg: string) => {
      logs.push(msg)
      onLog?.(msg)
    }

    log(`Building Docker image: ${tag}`)
    log(`Context: ${buildDir}`)

    // Copy project files to build context
    await execAsync(`cp -r ${params.context}/* ${buildDir}/ 2>/dev/null || true`)

    const { stdout, stderr } = await execAsync(
      `docker build -t ${tag} -f ${join(buildDir, "Dockerfile")} ${buildDir}`,
      { timeout: 300000 }
    )

    if (stdout) log(stdout)
    if (stderr) log(stderr)

    log(`Image built successfully: ${tag}`)

    return {
      success: true,
      imageTag: tag,
      logs,
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error"
    logs.push(`Build failed: ${errMsg}`)

    return {
      success: false,
      logs,
      error: errMsg,
    }
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

    const envFlags = Object.entries(env)
      .map(([k, v]) => `-e ${k}=${v}`)
      .join(" ")

    const { stdout } = await execAsync(
      `docker run -d -p ${port}:${port} ${envFlags} ${imageTag}`,
      { timeout: 30000 }
    )

    const containerId = stdout.trim()
    return {
      containerId,
      url: `http://localhost:${port}`,
    }
  } catch {
    return null
  }
}
