import { prisma } from "@/lib/db"
import { generateDockerfile } from "./dockerfile-gen"
import { isDockerAvailable, buildImage, runContainer } from "./container-builder"
import type { DeployStatus } from "@devflow/shared"
import { fetchRepoSnapshot, parseRepo } from "@/lib/github/client"
import { getUserAccessToken } from "@/lib/github/token-store"

const SIMULATED_STAGES: Array<{ status: DeployStatus; message: string; duration: number }> = [
  { status: "BUILDING", message: "Building Docker image...", duration: 3000 },
  { status: "PUSHING", message: "Pushing to container registry...", duration: 2000 },
  { status: "DEPLOYING", message: "Deploying to target environment...", duration: 3000 },
  { status: "RUNNING", message: "Deployment successful! Health check passed.", duration: 2000 },
]

interface DeploymentRecord {
  id: string
  userId: string
  project: { githubRepo: string | null; githubBranch: string | null }
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true"
}

export async function simulateDeployment(deploymentId: string): Promise<void> {
  const logs: string[] = []
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      project: { select: { githubRepo: true, githubBranch: true } },
    },
  })

  if (!deployment) return

  if (isDemoMode()) {
    await simulatedDeploy(deploymentId, logs)
    return
  }

  const hasDocker = await isDockerAvailable()
  if (!hasDocker) {
    logs.push(`[${new Date().toISOString()}] Docker is not available. Install Docker Desktop to use docker-local deployment, or set DEMO_MODE=true for a simulated run.`)
    await failDeployment(deploymentId, logs)
    return
  }

  await realDeploy(
    {
      id: deployment.id,
      userId: deployment.userId,
      project: deployment.project,
    },
    logs
  )
}

async function realDeploy(deployment: DeploymentRecord, logs: string[]): Promise<void> {
  const deploymentId = deployment.id
  const log = (msg: string) => {
    logs.push(`[${new Date().toISOString()}] ${msg}`)
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: "BUILDING", startedAt: new Date(), logs: JSON.stringify(logs) },
  })

  const files = await loadDeploymentFiles(deployment)
  if (!files) {
    log("No GitHub repository files available. Connect a real GitHub repo or enable demo mode.")
    await failDeployment(deploymentId, logs)
    return
  }

  log(`Loaded ${files.length} source files from GitHub.`)
  log("Generating Dockerfile...")
  const { dockerfile, port: containerPort } = generateDockerfile(files)
  log("Dockerfile generated.")
  log(dockerfile)

  log("Building Docker image...")
  const tag = `devflow/app:${deploymentId.slice(0, 12)}`

  const result = await buildImage({
    dockerfile,
    context: process.cwd(),
    tag,
    files,
    onLog: (line) => log(line),
  })

  if (!result.success) {
    log(`Build failed: ${result.error}`)
    result.logs.forEach((l) => log(l))
    await failDeployment(deploymentId, logs)
    return
  }

  log(`Image built: ${result.imageTag}`)
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      status: "PUSHING",
      dockerImage: result.imageTag,
      logs: JSON.stringify(logs),
    },
  })

  log("Starting local Docker container...")
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: "DEPLOYING", logs: JSON.stringify(logs) },
  })

  const containerName = `devflow-${deploymentId.slice(0, 12)}`
  const container = await runContainer({
    imageTag: result.imageTag ?? tag,
    port: containerPort,
    name: containerName,
    env: { NODE_ENV: "production" },
    labels: { "devflow.deployment": deploymentId },
  })

  if (container) {
    log(`Container started: ${container.containerId.slice(0, 12)} (host port ${container.hostPort})`)
    log(`Application available at ${container.url}`)
  } else {
    log("Image built, but the container could not be started automatically.")
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      status: container ? "RUNNING" : "FAILED",
      completedAt: new Date(),
      url: container?.url,
      logs: JSON.stringify(logs),
    },
  })
}

function isDeployableTextFile(path: string): boolean {
  return /\.(cjs|css|dockerfile|go|html|js|json|jsx|lock|mjs|py|rs|tsx?|txt|yaml|yml)$/i.test(path) ||
    ["Dockerfile", "Makefile", "Procfile", "requirements.txt", "pyproject.toml", "go.mod", "go.sum"].includes(path)
}

async function loadDeploymentFiles(deployment: DeploymentRecord): Promise<Array<{ path: string; content: string }> | null> {
  const repoRef = parseRepo(deployment.project.githubRepo)
  if (!repoRef) return null

  const token = await getUserAccessToken(deployment.userId)
  if (!token) return null

  const branch = deployment.project.githubBranch ?? "main"
  const files = await fetchRepoSnapshot({
    token,
    owner: repoRef.owner,
    repo: repoRef.repo,
    branch,
    fileFilter: isDeployableTextFile,
    maxFiles: 80,
    maxBytesPerFile: 250_000,
    maxScannedDirs: 40,
  })
  return files.length > 0 ? files.map(({ path, content }) => ({ path, content })) : null
}

async function failDeployment(deploymentId: string, logs: string[]): Promise<void> {
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      logs: JSON.stringify(logs),
    },
  })
}

async function simulatedDeploy(deploymentId: string, logs: string[]): Promise<void> {
  for (const stage of SIMULATED_STAGES) {
    const timestamp = new Date().toISOString()
    logs.push(`[${timestamp}] ${stage.message}`)

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: stage.status,
        startedAt: stage.status === "BUILDING" ? new Date() : undefined,
        logs: JSON.stringify(logs),
      },
    })

    await new Promise((resolve) => setTimeout(resolve, stage.duration))
  }

  const deployUrl = `https://staging-${deploymentId.slice(0, 8)}.devflow.app`

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      status: "RUNNING",
      completedAt: new Date(),
      url: deployUrl,
      dockerImage: `ghcr.io/devflow/app:${deploymentId.slice(0, 8)}`,
      logs: JSON.stringify([
        ...logs,
        `[${new Date().toISOString()}] Health check passed`,
        `[${new Date().toISOString()}] Application available at ${deployUrl}`,
      ]),
    },
  })
}
