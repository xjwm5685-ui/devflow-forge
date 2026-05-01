import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { generateDocumentSchema } from "@devflow/shared"
import { TRPCError } from "@trpc/server"

export const documentRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.document.findMany({
        where: {
          userId: ctx.session.id,
          ...(input?.projectId ? { projectId: input.projectId } : {}),
        },
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      })
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.document.findFirst({
        where: { id: input.id, userId: ctx.session.id },
        include: { project: true },
      })
    }),

  generate: protectedProcedure
    .input(generateDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.id },
        select: { id: true },
      })
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
      }

      const doc = await ctx.db.document.create({
        data: {
          projectId: input.projectId,
          userId: ctx.session.id,
          title: input.title,
          status: "GENERATING",
        },
      })

      const { generateDocument } = await import("@/lib/multimodal/pipeline")
      generateDocument(doc.id, input).catch(console.error)

      return doc
    }),
})
