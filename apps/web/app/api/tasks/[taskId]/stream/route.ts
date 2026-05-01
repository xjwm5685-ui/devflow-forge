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

  // Verify task ownership
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: session.id },
    select: { id: true, status: true },
  })
  if (!task) {
    return new Response("Not found", { status: 404 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "status", status: task.status })}\n\n`)
      )

      // If already completed, send history and close
      if (task.status === "COMPLETED" || task.status === "FAILED") {
        const history = messageBus.getHistory(taskId)
        for (const msg of history) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(msg)}\n\n`)
          )
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
        return
      }

      // Subscribe to live messages
      const unsubscribe = messageBus.subscribe(taskId, (message) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          )

          // Close stream when workflow completes
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

      // Cleanup on disconnect
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
