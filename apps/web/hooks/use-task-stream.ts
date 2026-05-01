"use client"

import { useEffect, useRef, useState } from "react"
import type { AgentMessage } from "@devflow/shared"

interface UseTaskStreamOptions {
  taskId: string | null
  enabled?: boolean
  onComplete?: () => void
}

type StreamStatus = "idle" | "connecting" | "streaming" | "done" | "error"

export function useTaskStream({ taskId, enabled = true, onComplete }: UseTaskStreamOptions) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [status, setStatus] = useState<StreamStatus>("idle")
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!taskId || !enabled) {
      setStatus("idle")
      setMessages([])
      return
    }

    setMessages([])
    setStatus("connecting")

    const es = new EventSource(`/api/tasks/${taskId}/stream`)

    es.onopen = () => setStatus("streaming")

    es.onmessage = (event) => {
      if (event.data === "[DONE]") {
        setStatus("done")
        es.close()
        onCompleteRef.current?.()
        return
      }

      try {
        const message = JSON.parse(event.data) as AgentMessage
        if (message.type === "status" && !message.id) return

        setMessages((prev) => [...prev, message])

        if ((message as unknown as Record<string, unknown>).__complete) {
          setStatus("done")
          es.close()
          onCompleteRef.current?.()
        }
        if (message.type === "error") {
          setStatus("error")
        }
      } catch {}
    }

    es.onerror = () => {
      setStatus("error")
      es.close()
    }

    return () => { es.close() }
  }, [taskId, enabled])

  const reset = () => {
    setMessages([])
    setStatus("idle")
  }

  return { messages, status, reset }
}
