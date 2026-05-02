import type { AgentMessage, AgentName } from "@devflow/shared"
import type { AgentMessage as DbAgentMessage } from "@prisma/client"
import { prisma } from "@/lib/db"

type MessageHandler = (message: AgentMessage) => void

function createId(): string {
  return crypto.randomUUID()
}

export function createAgentMessage(
  taskId: string,
  from: AgentName | "orchestrator" | "user",
  to: AgentName | "orchestrator" | "user",
  type: AgentMessage["type"],
  content: string,
  metadataOverrides?: Partial<AgentMessage["metadata"]>
): AgentMessage {
  return {
    id: createId(),
    taskId,
    from,
    to,
    type,
    content,
    metadata: {
      timestamp: Date.now(),
      ...metadataOverrides,
    },
  }
}

class MessageBus {
  private subscribers = new Map<string, Set<MessageHandler>>()
  private messages = new Map<string, AgentMessage[]>()

  async publish(taskId: string, message: AgentMessage): Promise<void> {
    const list = this.messages.get(taskId)
    if (list) {
      list.push(message)
    } else {
      this.messages.set(taskId, [message])
    }

    await prisma.agentMessage.create({
      data: {
        id: message.id,
        taskId: message.taskId,
        agentName: String(message.from),
        role: String(message.to),
        content: message.content,
        metadata: JSON.stringify(message.metadata),
      },
    }).catch(() => {
      // Ignore duplicate key errors
    })

    const handlers = this.subscribers.get(taskId)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message)
        } catch {
          // Ignore handler errors
        }
      }
    }
  }

  subscribe(taskId: string, handler: MessageHandler): () => void {
    let handlers = this.subscribers.get(taskId)
    if (!handlers) {
      handlers = new Set()
      this.subscribers.set(taskId, handlers)
    }
    handlers.add(handler)

    return () => {
      const set = this.subscribers.get(taskId)
      if (set) {
        set.delete(handler)
        if (set.size === 0) {
          this.subscribers.delete(taskId)
        }
      }
    }
  }

  async loadHistory(taskId: string): Promise<AgentMessage[]> {
    const rows = await prisma.agentMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    })

    const history: AgentMessage[] = rows.map((row: DbAgentMessage) => {
      let metadata: AgentMessage["metadata"] = { timestamp: row.createdAt.getTime() }
      if (row.metadata) {
        try {
          metadata = { ...JSON.parse(row.metadata), ...metadata }
        } catch {
          // Use default metadata
        }
      }

      return {
        id: row.id,
        taskId: row.taskId,
        from: row.agentName as AgentName | "orchestrator" | "user",
        to: row.role as AgentName | "orchestrator" | "user",
        type: "response",
        content: row.content,
        metadata,
      }
    })

    this.messages.set(taskId, history)
    return history
  }

  getHistory(taskId: string): AgentMessage[] {
    return this.messages.get(taskId) ?? []
  }

  clear(taskId: string): void {
    this.messages.delete(taskId)
    this.subscribers.delete(taskId)
  }
}

export const messageBus = new MessageBus()
