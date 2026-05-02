"use client"

import { CustomSelect } from "@/components/ui/custom-select"
import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Viewport,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useTaskStream } from "@/hooks/use-task-stream"
import type { AgentMessage, WorkflowDefinition } from "@devflow/shared"
import { safeJsonParse } from "@/lib/utils/safe-json"
import Link from "next/link"

const NODE_ACCENT: Record<string, string> = {
  trigger: "rgba(165,180,252,0.55)",
  agent: "rgba(125,211,252,0.55)",
  condition: "rgba(251,191,36,0.55)",
  deploy: "rgba(134,239,172,0.55)",
}

const AGENT_COLOR: Record<string, string> = {
  architect: "rgb(240 171 252)",
  coder:     "rgb(165 180 252)",
  qa:        "rgb(134 239 172)",
  devops:    "rgb(251 191 36)",
}

const BUILT_IN_AGENTS = [
  { name: "architect", label: "架构师", desc: "分析需求和系统设计" },
  { name: "coder",     label: "编码",   desc: "生成和修改代码" },
  { name: "qa",        label: "测试",   desc: "审查代码和测试" },
  { name: "devops",    label: "运维",   desc: "部署和 CI/CD" },
] as const

interface CustomNodeData {
  type: string
  label: string
  agentName?: string
  prompt?: string
  expression?: string
  environment?: string
  provider?: string
}

function CustomNode({ data, selected }: { data: CustomNodeData; selected?: boolean }) {
  const accent = NODE_ACCENT[data.type] ?? "rgba(255,255,255,0.3)"
  return (
    <div
      style={{
        position: "relative",
        minWidth: 180,
        padding: "12px 16px",
        borderRadius: 14,
        background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
        backdropFilter: "blur(22px) saturate(180%)",
        WebkitBackdropFilter: "blur(22px) saturate(180%)",
        border: selected ? "1px solid rgba(165,180,252,0.7)" : "1px solid rgba(255,255,255,0.10)",
        boxShadow: selected
          ? "inset 0 1px 0 rgba(255,255,255,0.20), 0 0 0 4px rgba(165,180,252,0.15), 0 12px 32px -10px rgba(0,0,0,0.5)"
          : "inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px -10px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 60, background: `radial-gradient(60% 100% at 100% 0%, ${accent}, transparent 70%)`, borderTopRightRadius: 14, pointerEvents: "none", opacity: 0.7 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: accent, boxShadow: `0 0 10px ${accent}` }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: "rgb(245 244 255)" }}>{data.label}</span>
      </div>
      {data.agentName && <div style={{ fontSize: 10.5, color: "rgb(156 154 192)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{data.agentName.replace("custom:", "")}</div>}
      {data.prompt && <div style={{ fontSize: 10, color: "rgba(156,154,192,0.7)", marginTop: 4, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.prompt}</div>}
    </div>
  )
}

const nodeTypes = { trigger: CustomNode, agent: CustomNode, condition: CustomNode, deploy: CustomNode }

function getNodeDataValue(data: Record<string, unknown>, key: string): string {
  const value = data[key]
  return typeof value === "string" ? value : ""
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
          <div key={filename} className="glass-soft" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", fontSize: 11, fontFamily: "var(--font-mono)", color: "rgb(var(--fg-2))", borderBottom: "1px solid rgba(255,255,255,0.06)", letterSpacing: "0.04em" }}>
              {filename}
            </div>
            <pre className="code-pane" style={{ background: "rgba(0,0,0,0.25)", border: "none", borderRadius: 0 }}>
              {code.split("\n").map((line, j) => {
                const isAddition = line.startsWith("+") && !line.startsWith("+++")
                const isDeletion = line.startsWith("-") && !line.startsWith("---")
                return (
                  <div key={j} style={{
                    color: isAddition ? "rgb(134 239 172)" : isDeletion ? "rgb(248 113 113)" : "rgb(var(--fg-3))",
                    background: isAddition ? "rgba(134,239,172,0.08)" : isDeletion ? "rgba(248,113,113,0.08)" : "transparent",
                    padding: "1px 0",
                  }}>{line}</div>
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
  const color = AGENT_COLOR[message.from] ?? "rgb(125 211 252)"
  const hasCode = message.content.includes("```")
  const isStatus = message.type === "status"
  const isError = message.type === "error"

  if (isStatus) {
    return (
      <div className="flex items-center gap-2 py-1" style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>
        <span className="dot dot-pulse" style={{ width: 5, height: 5, background: color, color }} />
        {message.content}
      </div>
    )
  }

  return (
    <div className="flex gap-3 py-2.5">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 30, height: 30, borderRadius: 10, marginTop: 2,
          background: `radial-gradient(circle, ${color}, transparent 70%)`,
          border: "1px solid rgba(255,255,255,0.15)",
          fontSize: 11, fontWeight: 600, color: "rgb(8 6 24)",
        }}
      >
        {message.from[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display-italic" style={{ fontSize: 14, color }}>{message.from}</span>
          {message.metadata?.tokenUsage && (
            <span style={{ fontSize: 10, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>
              {((message.metadata.tokenUsage.input + message.metadata.tokenUsage.output) / 1000).toFixed(1)}K
            </span>
          )}
        </div>
        {isError ? (
          <div style={{ fontSize: 12.5, padding: "10px 12px", borderRadius: 10, color: "rgb(248 113 113)", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.20)" }}>
            {message.content}
          </div>
        ) : hasCode ? (
          <DiffViewer content={message.content} />
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: 12.5, color: "rgb(var(--fg-2))" }}>
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
  const projectId = String(params.projectId)
  const { data: workflow, isLoading } = trpc.workflow.byId.useQuery({ id: workflowId })
  const { data: customAgents } = trpc.agent.customAgents.useQuery()
  const utils = trpc.useUtils()

  const [isExecuting, setIsExecuting] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [promptOpen, setPromptOpen] = useState(false)
  const [taskPrompt, setTaskPrompt] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const onCompleteRef = useCallback(() => { setIsExecuting(false) }, [])
  const { messages: streamMessages, status: streamStatus } = useTaskStream({
    taskId: activeTaskId,
    enabled: isExecuting,
    onComplete: onCompleteRef,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [streamMessages.length])

  const definition = workflow?.definition
  const initialDefinition = useMemo(() => {
    if (!definition) return { nodes: [], edges: [] }
    if (typeof definition === "object") return definition as WorkflowDefinition
    return safeJsonParse<WorkflowDefinition>(definition, { nodes: [], edges: [] })
  }, [definition])

  const initialViewport = initialDefinition.viewport
  const defaultViewport = useMemo<Viewport>(() => initialViewport ?? { x: 0, y: 0, zoom: 1 }, [initialViewport])
  const viewportRef = useRef<Viewport>(defaultViewport)
  const nextNodeIdRef = useRef(0)
  useEffect(() => { viewportRef.current = defaultViewport }, [defaultViewport])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    setNodes(
      initialDefinition.nodes?.map((n) => ({
        ...n,
        type: n.type || "agent",
        position: n.position ?? { x: 0, y: 0 },
        data: { type: n.type || "agent", ...(n.data as Record<string, unknown>) },
      })) ?? []
    )
    setEdges(
      initialDefinition.edges?.map((e, i: number) => ({
        ...e,
        id: e.id || `edge-${i}`,
        animated: true,
      })) ?? []
    )
  }, [initialDefinition, setNodes, setEdges])

  const selectedNode = nodes.find((node) => node.id === selectedNodeId)

  const onConnect = useCallback(
    (p: Connection) => setEdges((eds) => addEdge({ ...p, animated: true }, eds)),
    [setEdges]
  )

  function addNode(type: "trigger" | "agent" | "condition" | "deploy", data: Partial<CustomNodeData> = {}) {
    const existingIds = new Set(nodes.map((node) => node.id))
    let id = ""
    do {
      nextNodeIdRef.current += 1
      id = `${type}-${nextNodeIdRef.current}`
    } while (existingIds.has(id))
    const label = data.label ?? (
      type === "trigger" ? "Start" :
      type === "condition" ? "Condition" :
      type === "deploy" ? "Deploy" :
      "Agent"
    )
    setNodes((current) => [
      ...current,
      {
        id, type,
        position: { x: 160 + current.length * 32, y: 80 + current.length * 72 },
        data: { type, label, ...data },
      },
    ])
    setSelectedNodeId(id)
  }

  function updateSelectedNode(key: string, value: string) {
    setNodes((current) => current.map((node) => (
      node.id === selectedNodeId ? { ...node, data: { ...node.data, [key]: value } } : node
    )))
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) return
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId))
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
  }

  const executeWorkflow = trpc.workflow.execute.useMutation({
    onSuccess: (data) => { setActiveTaskId(data.taskId); setIsExecuting(true) },
  })
  const saveWorkflow = trpc.workflow.update.useMutation({
    onSuccess: () => utils.workflow.byId.invalidate({ id: workflowId }),
  })
  const saveAsTemplate = trpc.workflow.saveAsTemplate.useMutation({
    onSuccess: () => { utils.workflow.templates.invalidate(); setTemplateOpen(false) },
  })

  function saveDefinition() {
    saveWorkflow.mutate({
      id: workflowId,
      definition: {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type ?? "agent",
          position: node.position,
          data: node.data as Record<string, unknown>,
        })),
        edges: edges.map((edge) => ({
          id: edge.id, source: edge.source, target: edge.target,
          type: edge.type, animated: edge.animated,
        })),
        viewport: viewportRef.current,
      } as WorkflowDefinition,
    })
  }

  if (isLoading) {
    return <div style={{ height: "100vh", display: "grid", placeItems: "center", color: "rgb(var(--fg-3))" }}>Loading workflow…</div>
  }
  if (!workflow) {
    return (
      <div style={{ height: "100vh", display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <h1 className="headline" style={{ fontSize: 36 }}>Not <em>found.</em></h1>
          <Link href={`/dashboard/projects/${projectId}/workflows`} className="btn btn-glass" style={{ marginTop: 18 }}>返回工作流列表</Link>
        </div>
      </div>
    )
  }

  const selectedData = (selectedNode?.data ?? {}) as Record<string, unknown>
  const selectedType = getNodeDataValue(selectedData, "type") || selectedNode?.type || ""

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", padding: 16 }}>
      {/* Floating top bar */}
      <div className="glass-strong glass-edge" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 22px", marginBottom: 14, position: "relative", zIndex: 5 }}>
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${projectId}/workflows`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            ←
          </Link>
          <div>
            <span className="eyebrow" style={{ fontSize: 9.5 }}>Workflow</span>
            <h1 className="font-display-italic" style={{ fontSize: 22, marginTop: 2 }}>{workflow.name}</h1>
          </div>
          <span className="chip">{nodes.length} nodes</span>
          <span className="chip">{edges.length} edges</span>
        </div>
        <div className="flex items-center gap-2.5">
          {streamStatus === "streaming" && (
            <span className="chip-aurora">
              <span className="dot dot-pulse" style={{ background: "rgb(165 180 252)", color: "rgb(165 180 252)" }} />
              STREAMING
            </span>
          )}
          <button onClick={() => setTemplateOpen((open) => !open)} className="btn btn-ghost" style={{ fontSize: 12 }}>保存为模板</button>
          <button onClick={saveDefinition} disabled={saveWorkflow.isPending} className="btn btn-glass">
            {saveWorkflow.isPending ? "保存中…" : "保存"}
          </button>
          <button onClick={() => setPromptOpen(true)} disabled={isExecuting} className="btn btn-aurora">
            {isExecuting ? (
              <><div style={{ width: 12, height: 12, border: "1.5px solid rgba(8,6,24,0.3)", borderTopColor: "rgb(8 6 24)", borderRadius: "50%" }} className="spin" />执行中…</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>执行</>
            )}
          </button>
        </div>
      </div>

      {templateOpen && (
        <div className="glass glass-edge" style={{ padding: "14px 22px", marginBottom: 14, display: "flex", alignItems: "flex-end", gap: 14 }}>
          <div style={{ width: 240 }}>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>模板名称</label>
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="input" placeholder={workflow.name} />
          </div>
          <div className="flex-1">
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>描述</label>
            <input value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="input" placeholder="简述这个模板的用途" />
          </div>
          <button
            onClick={() => saveAsTemplate.mutate({ workflowId, name: templateName || workflow.name, description: templateDescription })}
            disabled={saveAsTemplate.isPending}
            className="btn btn-aurora"
          >
            创建模板
          </button>
          <button onClick={() => setTemplateOpen(false)} className="btn btn-ghost">取消</button>
        </div>
      )}

      {promptOpen && (
        <div className="glass glass-edge" style={{ padding: "14px 22px", marginBottom: 14 }}>
          <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>任务描述</label>
          <textarea
            value={taskPrompt}
            onChange={(e) => setTaskPrompt(e.target.value)}
            className="input"
            placeholder="描述你想让 AI 执行的任务，例如：为用户认证模块添加 JWT 刷新令牌支持"
            rows={3}
            style={{ width: "100%", resize: "vertical", minHeight: 60 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button onClick={() => setPromptOpen(false)} className="btn btn-ghost">取消</button>
            <button
              onClick={() => {
                setPromptOpen(false)
                executeWorkflow.mutate({ workflowId, input: taskPrompt.trim() ? { prompt: taskPrompt.trim() } : undefined })
              }}
              className="btn btn-aurora"
            >
              开始执行
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", gap: 14, minHeight: 0 }}>
        {/* Left palette */}
        <aside className="glass glass-edge" style={{ width: 256, padding: 16, overflowY: "auto" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Nodes</div>
          <div className="space-y-2 mb-5">
            {[
              { type: "trigger" as const,   label: "触发器",  desc: "开始或 webhook 入口", accent: "rgba(165,180,252,0.45)" },
              { type: "condition" as const, label: "条件分支", desc: "表达式判断",             accent: "rgba(251,191,36,0.45)" },
              { type: "deploy" as const,    label: "部署",    desc: "发布到环境",              accent: "rgba(134,239,172,0.45)" },
            ].map((n) => (
              <button key={n.type} onClick={() => addNode(n.type)} className="glass-soft glass-spot" style={{
                width: "100%", padding: "11px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
                position: "relative", overflow: "hidden",
              }}>
                <span style={{ width: 28, height: 28, borderRadius: 9, background: `radial-gradient(circle, ${n.accent}, transparent 70%)`, border: "1px solid rgba(255,255,255,0.10)", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgb(var(--fg-1))" }}>{n.label}</div>
                  <div style={{ fontSize: 10.5, color: "rgb(var(--fg-4))", marginTop: 2 }}>{n.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="eyebrow" style={{ marginBottom: 10 }}>Built-in agents</div>
          <div className="space-y-2 mb-5">
            {BUILT_IN_AGENTS.map((agent) => (
              <button
                key={agent.name}
                onClick={() => addNode("agent", { label: agent.label, agentName: agent.name })}
                className="glass-soft glass-spot"
                style={{ width: "100%", padding: "11px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 9, background: `radial-gradient(circle, ${AGENT_COLOR[agent.name]}, transparent 70%)`, border: "1px solid rgba(255,255,255,0.10)", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgb(var(--fg-1))" }}>{agent.label}</div>
                  <div style={{ fontSize: 10.5, color: "rgb(var(--fg-4))", marginTop: 2 }}>{agent.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="eyebrow" style={{ marginBottom: 10 }}>Custom agents</div>
          <div className="space-y-2">
            {customAgents?.map((agent) => (
              <button
                key={agent.id}
                onClick={() => addNode("agent", { label: agent.name, agentName: `custom:${agent.id}`, prompt: agent.description })}
                className="glass-soft glass-spot"
                style={{ width: "100%", padding: "11px 14px", textAlign: "left" }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: agent.color }} />
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: "rgb(var(--fg-1))" }}>{agent.name}</span>
                </div>
                <div style={{ fontSize: 10.5, color: "rgb(var(--fg-4))", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.description || agent.role}</div>
              </button>
            ))}
            {(!customAgents || customAgents.length === 0) && (
              <div style={{ fontSize: 11, color: "rgb(var(--fg-4))", padding: "0 4px" }}>在「智能体」页面创建后可用。</div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <div className="glass glass-edge" style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            onMoveEnd={(_, vp) => { viewportRef.current = vp }}
            nodeTypes={nodeTypes}
            defaultViewport={defaultViewport}
            fitView={!initialViewport}
            style={{ background: "transparent" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(255,255,255,0.10)" />
            <Controls />
            <MiniMap nodeColor={(n) => NODE_ACCENT[n.type ?? ""]?.replace(", 0.55)", ", 0.85)") ?? "rgba(255,255,255,0.4)"} />
          </ReactFlow>
        </div>

        {/* Right inspector */}
        <aside className="glass glass-edge" style={{ width: 420, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="eyebrow">Inspector</span>
            <h3 className="font-display-italic" style={{ fontSize: 18, marginTop: 4 }}>
              {selectedNode ? "Node config" : "Pick a node"}
            </h3>
            <p style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 4 }}>
              {selectedNode ? selectedNode.id : "从左侧添加节点，或点击画布上的节点配置参数。"}
            </p>
          </div>

          {selectedNode && (
            <div style={{ padding: 20, overflowY: "auto" }} className="space-y-4">
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>名称</label>
                <input value={getNodeDataValue(selectedData, "label")} onChange={(e) => updateSelectedNode("label", e.target.value)} className="input" />
              </div>

              {selectedType === "agent" && (
                <>
                  <div>
                    <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>智能体</label>
                    <CustomSelect
                      value={getNodeDataValue(selectedData, "agentName") || "coder"}
                      onChange={(value) => updateSelectedNode("agentName", value)}
                      placeholder="选择智能体"
                      options={[
                        ...BUILT_IN_AGENTS.map((agent) => ({
                          value: agent.name,
                          label: agent.label,
                          description: agent.desc,
                        })),
                        ...(customAgents?.map((agent) => ({
                          value: `custom:${agent.id}`,
                          label: agent.name,
                          description: agent.role,
                        })) ?? []),
                      ]}
                    />
                  </div>
                  <div>
                    <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>节点提示词</label>
                    <textarea value={getNodeDataValue(selectedData, "prompt")} onChange={(e) => updateSelectedNode("prompt", e.target.value)} className="textarea" style={{ minHeight: 140, fontFamily: "var(--font-mono)", fontSize: 12 }} />
                  </div>
                </>
              )}

              {selectedType === "condition" && (
                <div>
                  <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>表达式</label>
                  <textarea value={getNodeDataValue(selectedData, "expression")} onChange={(e) => updateSelectedNode("expression", e.target.value)} className="textarea" style={{ minHeight: 140, fontFamily: "var(--font-mono)", fontSize: 12 }} />
                </div>
              )}

              {selectedType === "deploy" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>环境</label>
                    <input value={getNodeDataValue(selectedData, "environment")} onChange={(e) => updateSelectedNode("environment", e.target.value)} placeholder="staging" className="input" />
                  </div>
                  <div>
                    <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>Provider</label>
                    <input value={getNodeDataValue(selectedData, "provider")} onChange={(e) => updateSelectedNode("provider", e.target.value)} placeholder="docker-local" className="input" />
                  </div>
                </div>
              )}

              <button
                onClick={deleteSelectedNode}
                className="btn"
                style={{
                  width: "100%",
                  background: "rgba(248,113,113,0.10)",
                  color: "rgb(248 113 113)",
                  border: "1px solid rgba(248,113,113,0.25)",
                }}
              >
                删除节点
              </button>
            </div>
          )}

          {(isExecuting || streamMessages.length > 0) && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div className="flex items-center justify-between" style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="eyebrow">Agent activity</span>
                <span style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>{streamMessages.length} msg</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
                {streamMessages.map((msg, i) => <MessageBubble key={msg.id ?? i} message={msg} />)}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
