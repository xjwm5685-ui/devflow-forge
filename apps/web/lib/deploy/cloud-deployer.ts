import { prisma } from "@/lib/db"
import type { DeployStatus } from "@devflow/shared"

const DEPLOY_STAGES: Array<{ status: DeployStatus; message: string; duration: number }> = [
  { status: "BUILDING", message: "Building Docker image...", duration: 3000 },
  { status: "PUSHING", message: "Pushing to container registry...", duration: 2000 },
  { status: "DEPLOYING", message: "Deploying to target environment...", duration: 3000 },
  { status: "RUNNING", message: "Deployment successful! Running health checks...", duration: 2000 },
]

export async function simulateDeployment(deploymentId: string): Promise<void> {
  const logs: string[] = []

  for (const stage of DEPLOY_STAGES) {
    // Update status
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: stage.status,
        startedAt: stage.status === "BUILDING" ? new Date() : undefined,
      },
    })

    // Add log entry
    const timestamp = new Date().toISOString()
    logs.push(`[${timestamp}] ${stage.message}`)

    // Update logs
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { logs: JSON.stringify(logs) },
    })

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, stage.duration))
  }

  // Generate a fake deployment URL
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
  })

  const deployUrl = `https://${deployment?.environment ?? "staging"}-${deploymentId.slice(0, 8)}.devflow.app`

  // Complete deployment
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
