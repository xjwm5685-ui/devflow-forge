import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { TRPCError } from "@trpc/server"

export const deploymentRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.deployment.findMany({
        where: {
          userId: ctx.session.id,
          ...(input?.projectId ? { projectId: input.projectId } : {}),
        },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      })
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.deployment.findFirst({
        where: { id: input.id, userId: ctx.session.id },
        include: { project: true },
      })
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      environment: z.enum(["staging", "production"]).default("staging"),
      provider: z.enum(["docker-local", "aws", "gcp", "vercel"]).default("docker-local"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.id },
        select: { id: true },
      })
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
      }

      const deployment = await ctx.db.deployment.create({
        data: {
          projectId: input.projectId,
          userId: ctx.session.id,
          environment: input.environment,
          status: "PENDING",
        },
      })

      const { simulateDeployment } = await import("@/lib/deploy/cloud-deployer")
      simulateDeployment(deployment.id).catch(console.error)

      return deployment
    }),
})
