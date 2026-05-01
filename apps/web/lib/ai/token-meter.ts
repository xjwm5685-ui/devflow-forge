import { prisma } from "@/lib/db"

interface TokenUsageParams {
  userId: string
  model: string
  inputTokens: number
  outputTokens: number
  taskId?: string
}

class TokenMeter {
  async record(params: TokenUsageParams): Promise<void> {
    const totalTokens = params.inputTokens + params.outputTokens
    const costCents = this.calculateCost(params.model, params.inputTokens, params.outputTokens)

    await prisma.$transaction(async (tx) => {
      await tx.tokenUsage.create({
        data: {
          userId: params.userId,
          model: params.model,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costCents,
          taskId: params.taskId,
        },
      })

      if (params.taskId) {
        await tx.task.update({
          where: { id: params.taskId },
          data: { tokenUsage: { increment: totalTokens } },
        })
      }
    })
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Cost per 1M tokens in cents (approximate)
    const costs: Record<string, { input: number; output: number }> = {
      "gpt-4o": { input: 250, output: 1000 },
      "gpt-4o-mini": { input: 15, output: 60 },
      "gpt-3.5-turbo": { input: 50, output: 150 },
      "mimo-v2.5-pro": { input: 200, output: 800 },
    }

    const cost = costs[model] ?? costs["gpt-4o"]!
    const inputCost = (inputTokens / 1_000_000) * cost.input
    const outputCost = (outputTokens / 1_000_000) * cost.output

    return Math.ceil((inputCost + outputCost) * 100)
  }

  async getUsageByTask(taskId: string): Promise<number> {
    const result = await prisma.tokenUsage.aggregate({
      where: { taskId },
      _sum: { inputTokens: true, outputTokens: true },
    })
    return (result._sum.inputTokens ?? 0) + (result._sum.outputTokens ?? 0)
  }

  async getUsageByUser(userId: string, days: number = 30): Promise<Record<string, number>> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const usage = await prisma.tokenUsage.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
    })

    const byDay: Record<string, number> = {}
    for (const u of usage) {
      const day = u.createdAt.toISOString().split("T")[0]!
      byDay[day] = (byDay[day] ?? 0) + u.inputTokens + u.outputTokens
    }

    return byDay
  }
}

export const tokenMeter = new TokenMeter()
