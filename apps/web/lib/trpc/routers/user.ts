import { router, protectedProcedure } from "../init"

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.id },
      select: {
        id: true,
        login: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    })
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [projectCount, taskCount, totalTokens] = await Promise.all([
      ctx.db.project.count({ where: { userId: ctx.session.id } }),
      ctx.db.task.count({ where: { userId: ctx.session.id } }),
      ctx.db.tokenUsage.aggregate({
        where: { userId: ctx.session.id },
        _sum: { inputTokens: true, outputTokens: true },
      }),
    ])

    return {
      projectCount,
      taskCount,
      totalTokens: (totalTokens._sum.inputTokens ?? 0) + (totalTokens._sum.outputTokens ?? 0),
    }
  }),
})
