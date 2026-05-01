import { router, protectedProcedure } from "../init"
import { prisma } from "@/lib/db"

export const agentRouter = router({
  status: protectedProcedure.query(async () => {
    // Get real task completion counts per agent type from DB
    const agentNames = ["architect", "coder", "qa", "devops"] as const

    const results = await Promise.all(
      agentNames.map(async (name) => {
        // Count completed tasks where this agent was involved (based on agent messages)
        const completedTasks = await prisma.agentMessage.findMany({
          where: {
            agentName: name,
            role: "response",
            task: { status: "COMPLETED" },
          },
          distinct: ["taskId"],
          select: { taskId: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        })

        return {
          name,
          status: "idle" as const,
          lastActive: completedTasks[0]?.createdAt ?? null,
          tasksCompleted: completedTasks.length,
        }
      })
    )

    return results
  }),

  tokenUsage: protectedProcedure.query(async ({ ctx }) => {
    const usage = await ctx.db.tokenUsage.findMany({
      where: { userId: ctx.session.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    const byDay: Record<string, number> = {}
    for (const u of usage) {
      const day = u.createdAt.toISOString().split("T")[0]!
      byDay[day] = (byDay[day] ?? 0) + u.inputTokens + u.outputTokens
    }

    return { usage, byDay }
  }),
})
