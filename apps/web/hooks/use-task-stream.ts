"use client"

import { useEffect, useCallback, useRef, useSyncExternalStore, startTransition } from "react"
import type { AgentMessage } from "@devflow/shared"

interface UseTaskStreamOptions {
  taskId: string | null
  enabled?: boolean
  onComplete?: () => void
}

type StreamStatus = "idle" | "connecting" | "streaming" | "done" | "error"

export function useTaskStream({ taskId, enabled = true, onComplete }: UseTaskStreamOptions) {
  const messagesRef = useRef<AgentMessage[]>([])
  const msgListenersRef = useRef(new Set<() => void>())
  const statusRef = useRef<StreamStatus>("idle")
  const statusListenersRef = useRef(new Set<() => void>())
  const onCompleteRef = useRef(onComplete)
  // Update ref in effect to avoid React Compiler lint error
  useEffect(() => { onCompleteRef.current = onComplete })

  const subscribeStatus = useCallback((listener: () => void) => {
    statusListenersRef.current.add(listener)
    return () => { statusListenersRef.current.delete(listener) }
  }, [])
  const getStatus = useCallback(() => statusRef.current, [])
  const status = useSyncExternalStore(subscribeStatus, getStatus, getStatus)

  const subscribeMessages = useCallback((listener: () => void) => {
    msgListenersRef.current.add(listener)
    return () => { msgListenersRef.current.delete(listener) }
  }, [])
  const getMessages = useCallback(() => messagesRef.current, [])
  const messages = useSyncExternalStore(subscribeMessages, getMessages, getMessages)

  const updateStatus = useCallback((s: StreamStatus) => {
    statusRef.current = s
    statusListenersRef.current.forEach((l) => l())
  }, [])

  const appendMessage = useCallback((msg: AgentMessage) => {
    messagesRef.current = [...messagesRef.current, msg]
    msgListenersRef.current.forEach((l) => l())
  }, [])

  const clearMessages = useCallback(() => {
    messagesRef.current = []
    msgListenersRef.current.forEach((l) => l())
  }, [])

  const reset = useCallback(() => {
    clearMessages()
    updateStatus("idle")
  }, [clearMessages, updateStatus])

  useEffect(() => {
    if (!taskId || !enabled) {
      updateStatus("idle")
      return
    }

    startTransition(() => {
      clearMessages()
      updateStatus("connecting")
    })

    const es = new EventSource(`/api/tasks/${taskId}/stream`)

    es.onopen = () => updateStatus("streaming")

    es.onmessage = (event) => {
      if (event.data === "[DONE]") {
        updateStatus("done")
        es.close()
        onCompleteRef.current?.()
        return
      }

      try {
        const message = JSON.parse(event.data) as AgentMessage
        if (message.type === "status" && !message.id) return
        appendMessage(message)

        // Use structured completion signal from server
        if ((message as unknown as Record<string, unknown>).__complete) {
          updateStatus("done")
          es.close()
          onCompleteRef.current?.()
        }
        if (message.type === "error") {
          updateStatus("error")
        }
      } catch {}
    }

    es.onerror = () => {
      updateStatus("error")
      es.close()
    }

    return () => { es.close() }
  }, [taskId, enabled, updateStatus, clearMessages, appendMessage])

  return { messages, status, reset }
}
