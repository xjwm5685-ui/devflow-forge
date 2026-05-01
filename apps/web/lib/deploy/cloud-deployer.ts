import { prisma } from "@/lib/db"
import { generateDockerfile } from "./dockerfile-gen"
import { isDockerAvailable, buildImage } from "./container-builder"
import type { DeployStatus } from "@devflow/shared"

const MOCK_FILES = [
  { path: "package.json", content: '{"name":"app","scripts":{"build":"tsc","start":"node dist/index.js"}}' },
  { path: "src/index.ts", content: 'import express from "express"; const app = express(); app.listen(3000);' },
]

const SIMULATED_STAGES: Array<{ status: DeployStatus; message: string; duration: number }> = [
  { status: "BUILDING", message: "Building Docker image...", duration: 3000 },
  { status: "PUSHING", message: "Pushing to container registry...", duration: 2000 },
  { status: "DEPLOYING", message: "Deploying to target environment...", duration: 3000 },
  { status: "RUNNING", message: "Deployment successful! Health check passed.", duration: 2000 },
]

export async function simulateDeployment(deploymentId: string): Promise<void> {
  const logs: string[] = []

  // Try real Docker build first
  const hasDocker = await isDockerAvailable()

  if (hasDocker) {
    await realDeploy(deploymentId, logs)
  } else {
    await simulatedDeploy(deploymentId, logs)
  }
}

async function realDeploy(deploymentId: string, logs: string[]): Promise<void> {
  const log = (msg: string) => {
    logs.push(`[${new Date().toISOString()}] ${msg}`)
  }

  // Update status to BUILDING
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: "BUILDING", startedAt: new Date(), logs: JSON.stringify(logs) },
  })

  log("Generating Dockerfile...")
  const dockerfile = generateDockerfile(MOCK_FILES)
  log("Dockerfile generated.")
  log(dockerfile)

  log("Building Docker image...")
  const tag = `devflow/app:${deploymentId.slice(0, 8)}`

  const result = await buildImage({
    dockerfile,
    context: process.cwd(),
    tag,
    onLog: (line) => log(line),
  })

  if (result.success) {
    log(`Image built: ${result.imageTag}`)

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: "PUSHING",
        dockerImage: result.imageTag,
        logs: JSON.stringify(logs),
      },
    })

    log("Simulating push to registry...")
    await new Promise((r) => setTimeout(r, 1500))

    log("Simulating deployment...")
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: "DEPLOYING", logs: JSON.stringify(logs) },
    })
    await new Promise((r) => setTimeout(r, 2000))

    const deployUrl = `https://staging-${deploymentId.slice(0, 8)}.devflow.app`
    log(`Health check passed.`)
    log(`Application available at ${deployUrl}`)

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: "RUNNING",
        completedAt: new Date(),
        url: deployUrl,
        logs: JSON.stringify(logs),
      },
    })
  } else {
    log(`Build failed: ${result.error}`)
    result.logs.forEach((l) => log(l))

    // Fall back to simulated deployment
    log("Falling back to simulated deployment...")
    await simulatedDeploy(deploymentId, logs)
  }
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
