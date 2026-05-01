import { messageBus } from "@/lib/ai/agents/message-bus"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: session.id },
    select: { id: true, status: true },
  })
  if (!task) {
    return new Response("Not found", { status: 404 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "status", status: task.status })}\n\n`)
      )

      // For completed tasks, load history from DB (survives server restart)
      if (task.status === "COMPLETED" || task.status === "FAILED") {
        const history = await messageBus.loadHistory(taskId)
        for (const msg of history) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
        return
      }

      // For running tasks, stream live messages
      const unsubscribe = messageBus.subscribe(taskId, (message) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))

          if (message.type === "response" && message.content.includes("Workflow completed")) {
            setTimeout(() => {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
            }, 500)
          }
          if (message.type === "error" && message.content.includes("Workflow failed")) {
            setTimeout(() => {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
            }, 500)
          }
        } catch {
          // Stream closed
        }
      })

      request.signal.addEventListener("abort", () => {
        unsubscribe()
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
