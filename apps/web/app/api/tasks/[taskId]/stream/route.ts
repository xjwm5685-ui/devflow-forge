import { messageBus } from "@/lib/ai/agents/message-bus"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getSession()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const { taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: session.id },
    select: { id: true, status: true },
  })
  if (!task) return new Response("Not found", { status: 404 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", status: task.status })}\n\n`))

      if (task.status === "COMPLETED" || task.status === "FAILED") {
        const history = await messageBus.loadHistory(taskId)
        for (const msg of history) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
        return
      }

      const unsubscribe = messageBus.subscribe(taskId, (message) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
        } catch { /* stream closed */ }
      })

      // Poll DB for terminal state as fallback (handles cases where message bus misses completion)
      const pollInterval = setInterval(async () => {
        try {
          const current = await prisma.task.findFirst({
            where: { id: taskId },
            select: { status: true },
          })
          if (current?.status === "COMPLETED" || current?.status === "FAILED") {
            clearInterval(pollInterval)
            unsubscribe()
            const terminalMessage = current.status === "FAILED"
              ? { id: "__failed__", type: "error", content: "Workflow failed", __complete: true, from: "system", to: "user", taskId, metadata: { timestamp: Date.now() } }
              : { id: "__done__", type: "response", content: "Workflow completed", __complete: true, from: "system", to: "user", taskId, metadata: { timestamp: Date.now() } }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(terminalMessage)}\n\n`))
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          }
        } catch { /* ignore poll errors */ }
      }, 5000)

      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        clearInterval(pollInterval)
        unsubscribe()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ id: "__timeout__", type: "error", content: "Stream timeout", from: "system", to: "user", taskId, metadata: { timestamp: Date.now() } })}\n\n`))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        try { controller.close() } catch {}
      }, 5 * 60 * 1000)

      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval)
        clearTimeout(timeout)
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
