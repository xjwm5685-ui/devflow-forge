"use client"

import { trpc } from "@/lib/trpc/client"
import { Icon } from "@/components/shared/icon"
import { useState } from "react"

interface AgentForm {
  id?: string
  name: string
  role: string
  description: string
  systemPrompt: string
  model: string
  color: string
  icon: string
}

const EMPTY_AGENT: AgentForm = {
  name: "",
  role: "reviewer",
  description: "",
  systemPrompt: "",
  model: "",
  color: "#a5b4fc",
  icon: "bot",
}

const PRESET_COLORS = [
  "#a5b4fc", "#7dd3fc", "#86efac", "#fbbf24", "#f0abfc", "#fbcfe8",
]

export default function AgentsPage() {
  const utils = trpc.useUtils()
  const { data: agents } = trpc.agent.status.useQuery()
  const { data: customAgents } = trpc.agent.customAgents.useQuery()
  const { data: tokenData } = trpc.agent.tokenUsage.useQuery()
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<AgentForm>(EMPTY_AGENT)

  const createAgent = trpc.agent.createCustomAgent.useMutation({
    onSuccess: () => {
      utils.agent.customAgents.invalidate()
      utils.agent.status.invalidate()
      setFormOpen(false)
      setForm(EMPTY_AGENT)
    },
  })
  const updateAgent = trpc.agent.updateCustomAgent.useMutation({
    onSuccess: () => {
      utils.agent.customAgents.invalidate()
      utils.agent.status.invalidate()
      setFormOpen(false)
      setForm(EMPTY_AGENT)
    },
  })
  const deleteAgent = trpc.agent.deleteCustomAgent.useMutation({
    onSuccess: () => {
      utils.agent.customAgents.invalidate()
      utils.agent.status.invalidate()
    },
  })

  function editAgent(agent: NonNullable<typeof customAgents>[number]) {
    setForm({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      color: agent.color,
      icon: agent.icon,
    })
    setFormOpen(true)
  }

  function saveAgent() {
    const payload = {
      name: form.name,
      role: form.role,
      description: form.description,
      systemPrompt: form.systemPrompt,
      model: form.model,
      color: form.color,
      icon: form.icon,
    }

    if (form.id) updateAgent.mutate({ id: form.id, ...payload })
    else createAgent.mutate(payload)
  }

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280, position: "relative" }}>
      <div className="orb" style={{ width: 480, height: 480, top: -160, right: 60, background: "radial-gradient(circle, rgba(165,180,252,0.45), transparent 70%)" }} />

      {/* Header */}
      <div className="reveal flex items-end justify-between mb-10" style={{ position: "relative" }}>
        <div>
          <span className="eyebrow">Agents · 智能体</span>
          <h1 className="headline" style={{ fontSize: 56, marginTop: 8, lineHeight: 1.0 }}>
            Sentient <em>collaborators</em>
          </h1>
          <p style={{ color: "rgb(var(--fg-3))", fontSize: 13.5, marginTop: 12, maxWidth: 540, lineHeight: 1.6 }}>
            内置 4 个角色（架构师、编码、测试、运维）。需要专属角色？创建自定义智能体并拖入任意工作流。
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_AGENT); setFormOpen((open) => !open) }}
          className="btn btn-aurora flex-shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
          新建智能体
        </button>
      </div>

      {/* Form */}
      {formOpen && (
        <div className="reveal glass glass-edge" style={{ padding: 28, marginBottom: 28 }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className="eyebrow">{form.id ? "Editing" : "New agent"}</span>
              <h2 className="headline" style={{ fontSize: 24, marginTop: 4 }}>
                {form.id ? <>编辑 <em style={{ fontFamily: "var(--font-display)" }}>{form.name || "agent"}</em></> : <>Forge an <em style={{ fontFamily: "var(--font-display)" }}>agent</em></>}
              </h2>
            </div>
            <button onClick={() => setFormOpen(false)} className="btn btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }}>关闭</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>名称</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Security Reviewer" />
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>角色</label>
              <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input" placeholder="reviewer" />
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>模型（可选）</label>
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="留空使用全局" className="input" />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>描述</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="一句话总结这个智能体的职责" />
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>颜色</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 24, height: 24, borderRadius: 8,
                      background: c,
                      border: form.color === c ? "2px solid rgba(255,255,255,0.85)" : "1px solid rgba(255,255,255,0.10)",
                      boxShadow: form.color === c ? `0 0 12px ${c}` : "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
                <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input" style={{ width: 100, fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </div>
            </div>
            <div style={{ gridColumn: "span 3" }}>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>系统提示词</label>
              <textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} className="textarea" style={{ minHeight: 200, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6 }} placeholder="You are a senior code reviewer focused on..." />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={saveAgent}
              disabled={!form.name.trim() || !form.systemPrompt.trim() || createAgent.isPending || updateAgent.isPending}
              className="btn btn-aurora"
            >
              {form.id ? "保存修改" : "创建智能体"}
            </button>
            <button onClick={() => setFormOpen(false)} className="btn btn-ghost">取消</button>
          </div>
        </div>
      )}

      {/* Built-in agents */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="eyebrow">Built-in</span>
            <h2 className="headline" style={{ fontSize: 28, marginTop: 4 }}>
              内置 <em style={{ fontFamily: "var(--font-display)" }}>roster</em>
            </h2>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
          {agents?.map((agent, i) => {
            const accent = `${agent.color}88`
            return (
              <div key={agent.name} className="reveal glass glass-edge" style={{ padding: 22, position: "relative", overflow: "hidden", animationDelay: `${i * 60}ms` }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 100% at 0% 0%, ${accent}, transparent 60%)`, opacity: 0.4, pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex items-center justify-center"
                        style={{
                          width: 44, height: 44, borderRadius: 14,
                          background: `radial-gradient(circle, ${accent}, transparent 70%)`,
                          border: "1px solid rgba(255,255,255,0.15)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                          color: agent.color,
                        }}
                      >
                        <Icon name={agent.icon ?? "bot"} size={20} />
                      </span>
                      <div>
                        <div className="font-display-italic" style={{ fontSize: 22 }}>{agent.label}</div>
                        <p style={{ fontSize: 12, color: "rgb(var(--fg-3))", marginTop: 2 }}>{agent.description}</p>
                      </div>
                    </div>
                    <span className="chip" style={{ background: agent.status === "idle" ? "rgba(134,239,172,0.10)" : "rgba(251,191,36,0.10)", borderColor: agent.status === "idle" ? "rgba(134,239,172,0.25)" : "rgba(251,191,36,0.25)" }}>
                      <span className="dot dot-pulse" style={{ background: agent.status === "idle" ? "rgb(var(--good))" : "rgb(var(--warn))", color: agent.status === "idle" ? "rgb(var(--good))" : "rgb(var(--warn))" }} />
                      {agent.builtIn ? "内置" : "自定义"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="glass-soft" style={{ padding: 14 }}>
                      <div className="headline" style={{ fontSize: 26 }}>{agent.tasksCompleted}</div>
                      <div className="eyebrow" style={{ marginTop: 4 }}>已完成任务</div>
                    </div>
                    <div className="glass-soft" style={{ padding: 14 }}>
                      <div className="font-display-italic" style={{ fontSize: 18, color: agent.lastActive ? "rgb(var(--fg-1))" : "rgb(var(--fg-4))" }}>
                        {agent.lastActive ? new Date(agent.lastActive).toLocaleTimeString("zh-CN") : "—"}
                      </div>
                      <div className="eyebrow" style={{ marginTop: 4 }}>Last active</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Custom agents */}
      {customAgents && customAgents.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <span className="eyebrow">Custom</span>
              <h2 className="headline" style={{ fontSize: 28, marginTop: 4 }}>
                你的 <em style={{ fontFamily: "var(--font-display)" }}>fabricators</em>
              </h2>
            </div>
            <span className="chip">{customAgents.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
            {customAgents.map((agent, i) => (
              <div key={agent.id} className="reveal glass glass-edge" style={{ padding: 20, position: "relative", overflow: "hidden", animationDelay: `${i * 50}ms` }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 100% at 100% 0%, ${agent.color}55, transparent 60%)`, opacity: 0.5, pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-display-italic" style={{ fontSize: 20 }}>{agent.name}</div>
                      <div className="chip" style={{ marginTop: 4, padding: "2px 8px", fontSize: 10 }}>{agent.role}</div>
                    </div>
                    <span style={{ width: 14, height: 14, borderRadius: 999, background: agent.color, boxShadow: `0 0 12px ${agent.color}` }} />
                  </div>
                  <p className="line-clamp-2" style={{ fontSize: 12, color: "rgb(var(--fg-3))", lineHeight: 1.55, minHeight: 36, marginBottom: 14 }}>
                    {agent.description || agent.systemPrompt}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => editAgent(agent)} className="btn btn-glass" style={{ flex: 1, fontSize: 12, padding: "6px 12px" }}>编辑</button>
                    <button
                      onClick={() => deleteAgent.mutate({ id: agent.id })}
                      className="btn"
                      style={{
                        fontSize: 12, padding: "6px 12px",
                        background: "rgba(248,113,113,0.10)",
                        color: "rgb(248 113 113)",
                        border: "1px solid rgba(248,113,113,0.22)",
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Token usage */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="eyebrow">Telemetry · 30 days</span>
            <h2 className="headline" style={{ fontSize: 28, marginTop: 4 }}>
              Token <em style={{ fontFamily: "var(--font-display)" }}>flux</em>
            </h2>
          </div>
        </div>
        <div className="glass glass-edge" style={{ padding: 28 }}>
          {tokenData?.byDay && Object.keys(tokenData.byDay).length > 0 ? (() => {
            const entries = Object.entries(tokenData.byDay)
            const maxTokens = Math.max(...Object.values(tokenData.byDay))
            const total = Object.values(tokenData.byDay).reduce((s, v) => s + v, 0)
            return (
              <>
                <div className="flex items-baseline gap-3 mb-5">
                  <span className="headline" style={{ fontSize: 44 }}>{(total / 1000).toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>K · cumulative</span>
                </div>
                <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 6 }}>
                  {entries.map(([day, tokens]) => {
                    const height = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0
                    return (
                      <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%" }}>
                        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                          <div
                            style={{
                              width: "100%",
                              height: `${height}%`,
                              background: "linear-gradient(180deg, rgba(240,171,252,0.85), rgba(125,211,252,0.5))",
                              borderRadius: "6px 6px 2px 2px",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                              transition: "height 0.6s var(--ease-glass)",
                              minHeight: tokens > 0 ? 2 : 0,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 9.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
                          {day.split("-")[2]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })() : (
            <div style={{ height: 180, display: "grid", placeItems: "center", color: "rgb(var(--fg-4))" }}>
              <div style={{ textAlign: "center" }}>
                <div className="font-display-italic" style={{ fontSize: 22, marginBottom: 4 }}>quiet sky.</div>
                <div style={{ fontSize: 12 }}>暂无数据，运行工作流后将显示用量。</div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
