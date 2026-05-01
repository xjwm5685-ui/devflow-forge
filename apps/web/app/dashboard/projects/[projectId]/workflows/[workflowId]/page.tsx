"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import { useState, useCallback, useMemo } from "react"
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

const nodeColors: Record<string, string> = {
  trigger: "#6366f1",
  agent: "#3b82f6",
  condition: "#f59e0b",
  deploy: "#10b981",
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
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: nodeColors[data.type] ?? "#6b7280" }}
        />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      {data.agentName && (
        <div className="text-xs text-gray-500 mt-1 capitalize">{data.agentName}</div>
      )}
    </div>
  )
}

const nodeTypes = {
  trigger: CustomNode,
  agent: CustomNode,
  condition: CustomNode,
  deploy: CustomNode,
}

export default function WorkflowEditorPage() {
  const params = useParams()
  const workflowId = params.workflowId as string
  const { data: workflow, isLoading } = trpc.workflow.byId.useQuery({ id: workflowId })
  const utils = trpc.useUtils()

  const [isExecuting, setIsExecuting] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<Record<string, string>>({})

  // Parse workflow definition
  const definition = workflow?.definition
  const initialDefinition = useMemo(() => {
    if (!definition) return { nodes: [] as Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>, edges: [] as Array<{ id: string; source: string; target: string }> }
    try {
      return JSON.parse(definition)
    } catch {
      return { nodes: [], edges: [] }
    }
  }, [definition])

  const [nodes, , onNodesChange] = useNodesState(
    initialDefinition.nodes?.map((n: { id: string; type: string; [key: string]: unknown }) => ({
      ...n,
      type: n.type || "agent",
    })) ?? []
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialDefinition.edges?.map((e: { id: string; source: string; target: string }, i: number) => ({
      ...e,
      id: e.id || `edge-${i}`,
      animated: true,
      style: { stroke: "#6366f1" },
    })) ?? []
  )

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#6366f1" } }, eds))
    },
    [setEdges]
  )

  const executeWorkflow = trpc.workflow.execute.useMutation({
    onSuccess: (data) => {
      setIsExecuting(true)
      // Poll for task status
      const interval = setInterval(async () => {
        try {
          const task = await utils.task.byId.fetch({ id: data.taskId })
          if (task?.status === "COMPLETED" || task?.status === "FAILED") {
            setIsExecuting(false)
            clearInterval(interval)
          }
          // Update execution status
          if (task?.agentTrace) {
            const trace = JSON.parse(task.agentTrace)
            const statusMap: Record<string, string> = {}
            for (const msg of trace) {
              if (msg.from && msg.type === "status") {
                statusMap[msg.from] = msg.content
              }
            }
            setExecutionStatus(statusMap)
          }
        } catch {
          // ignore polling errors
        }
      }, 2000)
    },
  })

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading workflow...</div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Workflow not found</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div>
          <h1 className="text-sm font-semibold text-white">{workflow.name}</h1>
          <p className="text-xs text-gray-500">{workflow.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              executeWorkflow.mutate({ workflowId })
            }}
            disabled={isExecuting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Executing...
              </>
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

      {/* Flow Editor */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-950"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f2937" />
          <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg" />
          <MiniMap
            className="!bg-gray-900 !border-gray-700"
            nodeColor={(n) => nodeColors[n.type ?? ""] ?? "#6b7280"}
          />
        </ReactFlow>
      </div>

      {/* Execution Status */}
      {isExecuting && Object.keys(executionStatus).length > 0 && (
        <div className="h-48 border-t border-gray-800 bg-gray-900/50 p-4 overflow-auto">
          <h3 className="text-sm font-semibold text-white mb-3">Agent Activity</h3>
          <div className="space-y-2">
            {Object.entries(executionStatus).map(([agent, status]) => (
              <div key={agent} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-white capitalize">{agent}:</span>{" "}
                  <span className="text-gray-400">{status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
