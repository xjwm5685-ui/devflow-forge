"use client"

import { useEffect, useCallback, useRef, useSyncExternalStore, startTransition } from "react"
import type { AgentMessage } from "@devflow/shared"

interface UseTaskStreamOptions {
  taskId: string | null
  enabled?: boolean
  onMessage?: (message: AgentMessage) => void
  onComplete?: () => void
  onError?: (error: string) => void
}

type StreamStatus = "idle" | "connecting" | "streaming" | "done" | "error"

export function useTaskStream({ taskId, enabled = true, onMessage, onComplete, onError }: UseTaskStreamOptions) {
  const messagesRef = useRef<AgentMessage[]>([])
  const msgListenersRef = useRef(new Set<() => void>())
  const statusRef = useRef<StreamStatus>("idle")
  const statusListenersRef = useRef(new Set<() => void>())

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
        onComplete?.()
        return
      }

      try {
        const message = JSON.parse(event.data) as AgentMessage
        if (message.type === "status" && !message.id) return

        appendMessage(message)
        onMessage?.(message)

        if (message.type === "response" && message.content.includes("Workflow completed")) {
          updateStatus("done")
        }
        if (message.type === "error") {
          updateStatus("error")
          onError?.(message.content)
        }
      } catch {
        // Skip malformed messages
      }
    }

    es.onerror = () => {
      updateStatus("error")
      es.close()
    }

    return () => { es.close() }
  }, [taskId, enabled, onMessage, onComplete, onError, updateStatus, clearMessages, appendMessage])

  return { messages, status, reset }
}
