"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { AgentMessage } from "@devflow/shared"

interface UseTaskStreamOptions {
  taskId: string | null
  enabled?: boolean
  onComplete?: () => void
}

type StreamStatus = "idle" | "connecting" | "streaming" | "done" | "error"

export function useTaskStream({ taskId, enabled = true, onComplete }: UseTaskStreamOptions) {
  const [messagesState, setMessagesState] = useState<{ taskId: string | null; messages: AgentMessage[] }>({ taskId: null, messages: [] })
  const [statusState, setStatusState] = useState<{ taskId: string | null; status: StreamStatus }>({ taskId: null, status: "idle" })
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!taskId || !enabled) {
      return
    }

    const es = new EventSource(`/api/tasks/${taskId}/stream`)

    es.onopen = () => setStatusState({ taskId, status: "streaming" })

    es.onmessage = (event) => {
      if (event.data === "[DONE]") {
        setStatusState({ taskId, status: "done" })
        es.close()
        onCompleteRef.current?.()
        return
      }

      try {
        const message = JSON.parse(event.data) as AgentMessage
        if (message.type === "status" && !message.id) return

        setMessagesState((prev) => ({
          taskId,
          messages: prev.taskId === taskId ? [...prev.messages, message] : [message],
        }))

        if ((message as unknown as Record<string, unknown>).__complete) {
          setStatusState({ taskId, status: "done" })
          es.close()
          onCompleteRef.current?.()
        }
        if (message.type === "error") {
          setStatusState({ taskId, status: "error" })
        }
      } catch {}
    }

    es.onerror = () => {
      setStatusState({ taskId, status: "error" })
      es.close()
    }

    return () => { es.close() }
  }, [taskId, enabled])

  const reset = useCallback(() => {
    setMessagesState({ taskId: null, messages: [] })
    setStatusState({ taskId: null, status: "idle" })
  }, [])

  const messages = messagesState.taskId === taskId ? messagesState.messages : []
  const status: StreamStatus = !taskId || !enabled
    ? "idle"
    : statusState.taskId === taskId
      ? statusState.status
      : "connecting"

  return { messages, status, reset }
}
