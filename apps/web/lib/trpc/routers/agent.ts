import { router, protectedProcedure } from "../init"

export const agentRouter = router({
  status: protectedProcedure.query(async () => {
    // Return mock agent statuses
    return [
      { name: "architect", status: "idle", lastActive: new Date(), tasksCompleted: 12 },
      { name: "coder", status: "idle", lastActive: new Date(), tasksCompleted: 28 },
      { name: "qa", status: "idle", lastActive: new Date(), tasksCompleted: 19 },
      { name: "devops", status: "idle", lastActive: new Date(), tasksCompleted: 7 },
    ]
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
