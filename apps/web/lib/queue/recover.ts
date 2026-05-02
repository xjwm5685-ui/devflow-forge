import { prisma } from "@/lib/db"

// On startup, reset tasks stuck in RUNNING/BUILDING/GENERATING state
// These are from previous process crashes
export async function recoverStuckTasks(): Promise<void> {
  const stuckStatuses = ["RUNNING", "BUILDING", "PUSHING", "DEPLOYING", "GENERATING"]

  const stuckTasks = await prisma.task.findMany({
    where: { status: { in: stuckStatuses } },
    select: { id: true, status: true },
  })

  if (stuckTasks.length > 0) {
    await prisma.task.updateMany({
      where: { id: { in: stuckTasks.map((t: { id: string }) => t.id) } },
      data: { status: "FAILED", completedAt: new Date() },
    })
    console.log(`[Recovery] Reset ${stuckTasks.length} stuck tasks to FAILED`)
  }

  const stuckDeploys = await prisma.deployment.findMany({
    where: { status: { in: stuckStatuses } },
    select: { id: true },
  })

  if (stuckDeploys.length > 0) {
    await prisma.deployment.updateMany({
      where: { id: { in: stuckDeploys.map((d: { id: string }) => d.id) } },
      data: { status: "FAILED", completedAt: new Date() },
    })
    console.log(`[Recovery] Reset ${stuckDeploys.length} stuck deployments to FAILED`)
  }

  const stuckDocs = await prisma.document.findMany({
    where: { status: "GENERATING" },
    select: { id: true },
  })

  if (stuckDocs.length > 0) {
    await prisma.document.updateMany({
      where: { id: { in: stuckDocs.map((d: { id: string }) => d.id) } },
      data: { status: "FAILED" },
    })
    console.log(`[Recovery] Reset ${stuckDocs.length} stuck documents to FAILED`)
  }
}
