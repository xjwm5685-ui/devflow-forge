import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { createProjectSchema, updateProjectSchema } from "@devflow/shared"
import { TRPCError } from "@trpc/server"

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { userId: ctx.session.id },
      include: {
        _count: { select: { tasks: true, workflows: true, deployments: true } },
      },
      orderBy: { updatedAt: "desc" },
    })
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.id },
        include: {
          workflows: true,
          tasks: { orderBy: { createdAt: "desc" }, take: 10, include: { _count: { select: { tokenUsage: true } } } },
          deployments: { orderBy: { createdAt: "desc" }, take: 5 },
          documents: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      })
    }),

  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.create({
        data: {
          ...input,
          userId: ctx.session.id,
        },
      })
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const result = await ctx.db.project.updateMany({
        where: { id, userId: ctx.session.id },
        data,
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
      return ctx.db.project.findUnique({ where: { id } })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.project.deleteMany({
        where: { id: input.id, userId: ctx.session.id },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
      return { success: true }
    }),
})
