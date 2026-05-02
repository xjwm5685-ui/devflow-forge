import { router, protectedProcedure } from "../init"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { AGENT_CONFIG, AGENT_NAMES } from "@devflow/shared"
import {
  createCustomAgent,
  deleteCustomAgent,
  listCustomAgents,
  toAgentName,
  updateCustomAgent,
} from "@/lib/ai/custom-agents"

const customAgentInput = z.object({
  name: z.string().min(1).max(80),
  role: z.string().max(80).default("custom"),
  description: z.string().max(300).default(""),
  systemPrompt: z.string().min(1).max(8000),
  model: z.string().max(120).default(""),
  color: z.string().max(32).default("#38bdf8"),
  icon: z.string().max(32).default("bot"),
})

async function getAgentStats(agentName: string) {
  const completedTasks = await prisma.agentMessage.findMany({
    where: {
      agentName,
      role: "response",
      task: { status: "COMPLETED" },
    },
    distinct: ["taskId"],
    select: { taskId: true },
  })

  const lastMessage = await prisma.agentMessage.findFirst({
    where: { agentName },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return {
    status: "idle" as const,
    lastActive: lastMessage?.createdAt ?? null,
    tasksCompleted: completedTasks.length,
  }
}

export const agentRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    // Get real task completion counts per agent type from DB
    const builtIns = await Promise.all(AGENT_NAMES.map(async (name) => ({
      name,
      label: AGENT_CONFIG[name].label,
      description: AGENT_CONFIG[name].description,
      icon: AGENT_CONFIG[name].icon,
      color: AGENT_CONFIG[name].color,
      builtIn: true,
      ...(await getAgentStats(name)),
    })))

    const custom = await Promise.all(listCustomAgents(ctx.session.id).map(async (agent) => {
      const name = toAgentName(agent.id)
      return {
        name,
        label: agent.name,
        description: agent.description || agent.role,
        icon: agent.icon,
        color: agent.color,
        builtIn: false,
        customAgentId: agent.id,
        ...(await getAgentStats(name)),
      }
    }))

    return [...builtIns, ...custom]
  }),

  customAgents: protectedProcedure.query(({ ctx }) => {
    return listCustomAgents(ctx.session.id)
  }),

  createCustomAgent: protectedProcedure
    .input(customAgentInput)
    .mutation(({ ctx, input }) => {
      return createCustomAgent(ctx.session.id, input)
    }),

  updateCustomAgent: protectedProcedure
    .input(customAgentInput.partial().extend({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return updateCustomAgent(ctx.session.id, id, data)
    }),

  deleteCustomAgent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteCustomAgent(ctx.session.id, input.id)
      return { deleted }
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
