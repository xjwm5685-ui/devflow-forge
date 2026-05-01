"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import { useState, useCallback, useEffect, useRef } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useTaskStream } from "@/hooks/use-task-stream"
import type { AgentMessage } from "@devflow/shared"

const nodeColors: Record<string, string> = {
  trigger: "#6366f1",
  agent: "#3b82f6",
  condition: "#f59e0b",
  deploy: "#10b981",
}

const agentColors: Record<string, string> = {
  architect: "#8b5cf6",
  coder: "#3b82f6",
  qa: "#10b981",
  devops: "#f59e0b",
}

interface CustomNodeData {
  type: string
  label: string
  agentName?: string
}

function CustomNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 min-w-[150px]">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColors[data.type] ?? "#6b7280" }} />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      {data.agentName && <div className="text-xs text-gray-500 mt-1 capitalize">{data.agentName}</div>}
    </div>
  )
}

const nodeTypes = { trigger: CustomNode, agent: CustomNode, condition: CustomNode, deploy: CustomNode }

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

function DiffViewer({ content }: { content: string }) {
  const files = content.split(/(?=### File:|```[\w]* filename)/).filter(Boolean)
  return (
    <div className="space-y-3">
      {files.map((file) => {
        const filenameMatch = file.match(/(?:### File:|filename[=:]\s*)(\S+)/)
        const filename = filenameMatch?.[1]
        const codeMatch = file.match(/```[\w]*\n([\s\S]*?)```/)
        const code = codeMatch?.[1]
        if (!filename || !code) return null
        return (
          <div key={filename} className="rounded-lg overflow-hidden border border-gray-700">
            <div className="bg-gray-800 px-3 py-1.5 text-xs font-mono text-gray-300 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {filename}
            </div>
            <pre className="p-3 bg-gray-900/80 text-xs font-mono overflow-x-auto">
              {code.split("\n").map((line, j) => {
                const isAddition = line.startsWith("+") && !line.startsWith("+++")
                const isDeletion = line.startsWith("-") && !line.startsWith("---")
                return (
                  <div key={j} className={`${isAddition ? "text-emerald-400 bg-emerald-900/20" : isDeletion ? "text-red-400 bg-red-900/20" : "text-gray-300"}`}>
                    {line}
                  </div>
                )
              })}
            </pre>
          </div>
        )
      })}
    </div>
  )
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const color = agentColors[message.from] ?? "#6b7280"
  const hasCode = message.content.includes("```")
  const isStatus = message.type === "status"
  const isError = message.type === "error"

  if (isStatus) {
    return (
      <div className="flex items-center gap-2 py-1 text-xs text-gray-500">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
        <span>{message.content}</span>
      </div>
    )
  }

  return (
    <div className="flex gap-3 py-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: color }}>
        {message.from[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white capitalize">{message.from}</span>
          {message.metadata?.tokenUsage && (
            <span className="text-[10px] text-gray-600 font-mono">
              {((message.metadata.tokenUsage.input + message.metadata.tokenUsage.output) / 1000).toFixed(1)}K tokens
            </span>
          )}
        </div>
        {isError ? (
          <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{message.content}</div>
        ) : hasCode ? (
          <DiffViewer content={message.content} />
        ) : (
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {message.content.slice(0, 2000)}{message.content.length > 2000 && "..."}
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkflowEditorPage() {
  const params = useParams()
  const workflowId = String(params.workflowId)
  const { data: workflow, isLoading } = trpc.workflow.byId.useQuery({ id: workflowId })

  const [isExecuting, setIsExecuting] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Stable callback refs to avoid SSE re-connections
  const onCompleteRef = useCallback(() => { setIsExecuting(false) }, [])

  const { messages: streamMessages, status: streamStatus } = useTaskStream({
    taskId: activeTaskId,
    enabled: isExecuting,
    onComplete: onCompleteRef,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [streamMessages])

  // Parse workflow definition with safe JSON parse
  const definition = workflow?.definition
  const initialDefinition = safeJsonParse(definition, { nodes: [], edges: [] })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState([] as any[])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any[])

  // Sync nodes/edges when workflow data loads
  useEffect(() => {
    setNodes(
      initialDefinition.nodes?.map((n: { id: string; type: string; [key: string]: unknown }) => ({
        ...n,
        type: n.type || "agent",
      })) ?? []
    )
    setEdges(
      initialDefinition.edges?.map((e: { id: string; source: string; target: string }, i: number) => ({
        ...e,
        id: e.id || `edge-${i}`,
        animated: true,
        style: { stroke: "#6366f1" },
      })) ?? []
    )
  }, [initialDefinition, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#6366f1" } }, eds)),
    [setEdges]
  )

  const executeWorkflow = trpc.workflow.execute.useMutation({
    onSuccess: (data) => {
      setActiveTaskId(data.taskId)
      setIsExecuting(true)
    },
  })

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><div className="text-gray-400">Loading workflow...</div></div>
  }

  if (!workflow) {
    return <div className="h-full flex items-center justify-center"><div className="text-gray-400">Workflow not found</div></div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div>
          <h1 className="text-sm font-semibold text-white">{workflow.name}</h1>
          <p className="text-xs text-gray-500">{workflow.description}</p>
        </div>
        <div className="flex items-center gap-3">
          {streamStatus === "streaming" && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Streaming
            </span>
          )}
          <button
            onClick={() => executeWorkflow.mutate({ workflowId })}
            disabled={isExecuting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExecuting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Executing...</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Execute
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView className="bg-gray-950">
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f2937" />
            <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg" />
            <MiniMap className="!bg-gray-900 !border-gray-700" nodeColor={(n) => nodeColors[n.type ?? ""] ?? "#6b7280"} />
          </ReactFlow>
        </div>

        {(isExecuting || streamMessages.length > 0) && (
          <div className="w-[480px] border-l border-gray-800 bg-gray-900/30 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Agent Activity</h3>
              <span className="text-xs text-gray-500">{streamMessages.length} messages</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {streamMessages.map((msg, i) => (
                <MessageBubble key={msg.id ?? i} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
