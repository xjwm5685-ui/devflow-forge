import { EventEmitter } from "events"
import type { AgentMessage, AgentName } from "@devflow/shared"
import { prisma } from "@/lib/db"

class MessageBus {
  private emitter = new EventEmitter()
  private history: Map<string, AgentMessage[]> = new Map()

  async publish(taskId: string, message: AgentMessage): Promise<void> {
    // Store in memory
    const messages = this.history.get(taskId) ?? []
    messages.push(message)
    this.history.set(taskId, messages)

    // Emit for real-time subscribers
    this.emitter.emit(`task:${taskId}`, message)

    // Persist to database
    await prisma.agentMessage.create({
      data: {
        id: message.id,
        taskId: message.taskId,
        agentName: message.from,
        role: message.type === "response" ? "assistant" : "user",
        content: message.content,
        metadata: JSON.stringify(message.metadata),
      },
    }).catch(console.error)
  }

  subscribe(taskId: string, handler: (message: AgentMessage) => void): () => void {
    const channel = `task:${taskId}`
    this.emitter.on(channel, handler)
    return () => this.emitter.off(channel, handler)
  }

  getHistory(taskId: string): AgentMessage[] {
    return this.history.get(taskId) ?? []
  }

  async loadHistory(taskId: string): Promise<AgentMessage[]> {
    const dbMessages = await prisma.agentMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    })

    const messages: AgentMessage[] = dbMessages.map((m) => ({
      id: m.id,
      taskId: m.taskId,
      from: m.agentName as AgentName,
      to: "orchestrator" as const,
      type: m.role === "assistant" ? "response" : "request",
      content: m.content,
      metadata: JSON.parse(m.metadata ?? "{}"),
    }))

    this.history.set(taskId, messages)
    return messages
  }

  clear(taskId: string): void {
    this.history.delete(taskId)
  }
}

// Singleton instance
export const messageBus = new MessageBus()

export function createAgentMessage(
  taskId: string,
  from: AgentName,
  to: AgentName | "orchestrator",
  type: AgentMessage["type"],
  content: string,
  metadata: AgentMessage["metadata"] = { timestamp: Date.now() }
): AgentMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    from,
    to,
    type,
    content,
    metadata: { ...metadata, timestamp: Date.now() },
  }
}
