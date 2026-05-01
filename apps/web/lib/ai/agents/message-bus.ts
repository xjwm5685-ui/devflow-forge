import { EventEmitter } from "events"
import type { AgentMessage, AgentName } from "@devflow/shared"
import { prisma } from "@/lib/db"

class MessageBus {
  private emitter = new EventEmitter()
  private history: Map<string, AgentMessage[]> = new Map()

  async publish(taskId: string, message: AgentMessage): Promise<void> {
    const messages = this.history.get(taskId) ?? []
    messages.push(message)
    this.history.set(taskId, messages)

    this.emitter.emit(`task:${taskId}`, message)

    // Persist full message data to database
    await prisma.agentMessage.create({
      data: {
        id: message.id,
        taskId: message.taskId,
        agentName: message.from,
        role: message.type,
        content: message.content,
        metadata: JSON.stringify({
          ...message.metadata,
          to: message.to,
        }),
      },
    })
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

    const messages: AgentMessage[] = dbMessages.map((m) => {
      const meta = JSON.parse(m.metadata ?? "{}")
      return {
        id: m.id,
        taskId: m.taskId,
        from: m.agentName as AgentName,
        to: (meta.to ?? "orchestrator") as AgentName | "orchestrator",
        type: m.role as AgentMessage["type"],
        content: m.content,
        metadata: meta,
      }
    })

    this.history.set(taskId, messages)
    return messages
  }

  clear(taskId: string): void {
    this.history.delete(taskId)
  }
}

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
    id: crypto.randomUUID(),
    taskId,
    from,
    to,
    type,
    content,
    metadata: { ...metadata, timestamp: Date.now() },
  }
}
