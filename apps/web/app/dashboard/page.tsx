"use client"

import { trpc } from "@/lib/trpc/client"
import Link from "next/link"
import { Icon } from "@/components/shared/icon"

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  COMPLETED: { label: "完成", tone: "good" },
  RUNNING:   { label: "运行", tone: "aurora" },
  FAILED:    { label: "失败", tone: "bad" },
  PENDING:   { label: "排队", tone: "muted" },
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_LABELS[status] ?? { label: status, tone: "muted" }
  const colorMap: Record<string, { bg: string; fg: string; ring: string }> = {
    good:   { bg: "rgba(134,239,172,0.14)",   fg: "rgb(134 239 172)", ring: "rgba(134,239,172,0.32)" },
    aurora: { bg: "rgba(165,180,252,0.16)",   fg: "rgb(165 180 252)", ring: "rgba(165,180,252,0.32)" },
    bad:    { bg: "rgba(248,113,113,0.14)",   fg: "rgb(248 113 113)", ring: "rgba(248,113,113,0.30)" },
    muted:  { bg: "rgba(255,255,255,0.05)",   fg: "rgb(var(--fg-3))",  ring: "rgba(255,255,255,0.10)" },
  }
  const c = colorMap[meta.tone]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px",
      borderRadius: 999,
      fontSize: 10.5,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.06em",
      color: c.fg,
      background: c.bg,
      border: `1px solid ${c.ring}`,
    }}>
      {status === "RUNNING" && <span className="dot dot-pulse" style={{ background: c.fg, color: c.fg }} />}
      {meta.label}
    </span>
  )
}

function NumericalReadout({ value, suffix }: { value: number | string; suffix?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="headline" style={{ fontSize: 56, fontWeight: 400, fontFamily: "var(--font-display)" }}>{value}</span>
      {suffix && <span style={{ fontSize: 12, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>{suffix}</span>}
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats } = trpc.user.stats.useQuery()
  const { data: tasks } = trpc.task.list.useQuery({ limit: 6 })
  const { data: agents } = trpc.agent.status.useQuery()
  const { data: user } = trpc.user.me.useQuery()

  const today = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())
  const timecode = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date())

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280 }}>
      {/* Editorial header */}
      <div className="reveal" style={{ marginBottom: 32 }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="chip-aurora">{timecode} · LIVE</span>
          <span className="eyebrow">{today}</span>
        </div>
        <h1 className="headline" style={{ fontSize: 56, lineHeight: 1.05, maxWidth: 820 }}>
          欢迎回来，<em>{user?.login ?? "operator"}</em>。
          <br />
          <span style={{ color: "rgb(var(--fg-3))", fontSize: 32, lineHeight: 1.2 }}>
            <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>Your liquid pipeline</span>{" "}
            <span style={{ fontFamily: "var(--font-sans)" }}>is humming —</span>
          </span>
        </h1>
        <p style={{ marginTop: 10, color: "rgb(var(--fg-3))", fontSize: 14, maxWidth: 600 }}>
          所有智能体在线，构建管道处于空闲状态。点开任意项目即可启动新一轮工作流。
        </p>
      </div>

      {/* Bento grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0,1fr))", gap: 16, marginBottom: 16 }}>
        {/* Hero stat — projects */}
        <Link href="/dashboard/projects" className="reveal glass glass-edge glass-spot" style={{ gridColumn: "span 5", padding: 28, position: "relative", overflow: "hidden", animationDelay: "60ms" }}>
          <div className="orb" style={{ width: 220, height: 220, top: -60, right: -60, background: "radial-gradient(circle, rgba(240,171,252,0.55), transparent 70%)" }} />
          <div className="flex items-center justify-between mb-6 relative">
            <span className="eyebrow">Projects</span>
            <Icon name="folder" size={18} className="text-indigo-300" />
          </div>
          <NumericalReadout value={stats?.projectCount ?? 0} suffix="repositories" />
          <div className="divider" style={{ margin: "20px 0 12px" }} />
          <div className="flex items-center justify-between" style={{ fontSize: 12, color: "rgb(var(--fg-3))" }}>
            <span>当前管理的代码仓库</span>
            <span className="chip">浏览 →</span>
          </div>
        </Link>

        {/* Tasks */}
        <div className="reveal glass glass-edge" style={{ gridColumn: "span 4", padding: 24, position: "relative", animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-6">
            <span className="eyebrow">Tasks</span>
            <Icon name="bolt" size={16} className="text-indigo-300" />
          </div>
          <NumericalReadout value={stats?.taskCount ?? 0} suffix="executed" />
          <div className="mt-6" style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "rgb(var(--good))" }}>▲</span> 在过去 24h 提交
          </div>
        </div>

        {/* Token usage */}
        <div className="reveal glass glass-edge" style={{ gridColumn: "span 3", padding: 24, position: "relative", animationDelay: "180ms" }}>
          <div className="flex items-center justify-between mb-6">
            <span className="eyebrow">Tokens</span>
            <Icon name="coin" size={16} className="text-indigo-300" />
          </div>
          <NumericalReadout value={`${((stats?.totalTokens ?? 0) / 1000).toFixed(1)}`} suffix="K · cumulative" />
          <div className="mt-6" style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>
            预算阈值未触发
          </div>
        </div>

        {/* Recent tasks (large) */}
        <div className="reveal glass glass-edge" style={{ gridColumn: "span 8", padding: 0, animationDelay: "240ms", overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ padding: "20px 24px 16px" }}>
            <div>
              <span className="eyebrow">Recent activity</span>
              <h2 className="headline" style={{ fontSize: 22, marginTop: 4 }}>最新任务</h2>
            </div>
            <Link href="/dashboard/projects" style={{ fontSize: 12, color: "rgb(165 180 252)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              VIEW ALL →
            </Link>
          </div>
          <div className="divider" />
          <div>
            {tasks?.slice(0, 5).map((task, i) => (
              <div
                key={task.id}
                className="reveal"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 24px",
                  borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  transition: "background 0.2s",
                  animationDelay: `${300 + i * 60}ms`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: task.status === "COMPLETED" ? "rgb(var(--good))" : task.status === "RUNNING" ? "rgb(165 180 252)" : task.status === "FAILED" ? "rgb(var(--bad))" : "rgba(255,255,255,0.2)",
                    boxShadow: task.status === "RUNNING" ? "0 0 12px rgba(165,180,252,0.7)" : "none",
                    flexShrink: 0,
                  }} />
                  <div className="min-w-0">
                    <div className="font-display-italic truncate" style={{ fontSize: 15.5, color: "rgb(var(--fg-1))" }}>
                      {task.type.replace(/_/g, " ").toLowerCase()}
                    </div>
                    <div style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      {task.project?.name ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {task.tokenUsageTotal > 0 && (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgb(var(--fg-4))" }}>
                      {(task.tokenUsageTotal / 1000).toFixed(1)}K
                    </span>
                  )}
                  <StatusPill status={task.status} />
                </div>
              </div>
            ))}
            {(!tasks || tasks.length === 0) && (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "rgb(var(--fg-4))", fontSize: 13 }}>
                <div className="font-display-italic" style={{ fontSize: 24, marginBottom: 8 }}>silence.</div>
                还没有运行过任务，去项目页启动一个吧。
              </div>
            )}
          </div>
        </div>

        {/* Agent constellation */}
        <div className="reveal glass glass-edge" style={{ gridColumn: "span 4", padding: 24, animationDelay: "300ms", position: "relative" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="eyebrow">Agents</span>
              <h2 className="headline" style={{ fontSize: 22, marginTop: 4 }}>智能体星座</h2>
            </div>
            <Link href="/dashboard/agents" style={{ fontSize: 11, color: "rgb(165 180 252)", fontFamily: "var(--font-mono)" }}>→</Link>
          </div>
          <div className="space-y-2.5">
            {agents?.map((agent) => {
              const tone = agent.status === "idle"
                ? { dot: "rgb(var(--good))", label: "在线", glow: "rgba(134,239,172,0.55)" }
                : { dot: "rgb(var(--warn))", label: "执行中", glow: "rgba(251,191,36,0.55)" }
              return (
                <div key={agent.name} className="flex items-center gap-3 px-3 py-2.5" style={{ borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ position: "relative", width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="dot" style={{ width: 8, height: 8, background: tone.dot, boxShadow: `0 0 12px ${tone.glow}` }} />
                  </span>
                  <span className="flex-1 capitalize" style={{ fontSize: 13.5, color: "rgb(var(--fg-1))" }}>{agent.name}</span>
                  <span style={{ fontSize: 10.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>{tone.label}</span>
                  <span className="chip" style={{ minWidth: 38, justifyContent: "center" }}>{agent.tasksCompleted}</span>
                </div>
              )
            })}
            {!agents && [1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 44 }} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="reveal" style={{ gridColumn: "span 12", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, animationDelay: "360ms" }}>
          {[
            { href: "/dashboard/projects", label: "导入仓库", subtitle: "从 GitHub 一键拉取", iconName: "folder", accent: "rgba(240,171,252,0.45)" },
            { href: "/dashboard/templates", label: "调用工作流模板", subtitle: "preset · architect→code→qa→deploy", iconName: "template", accent: "rgba(125,211,252,0.45)" },
            { href: "/dashboard/agents", label: "查看智能体执行", subtitle: "实时流式日志", iconName: "bot", accent: "rgba(134,239,172,0.45)" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-soft glass-spot"
              style={{
                position: "relative",
                padding: "18px 22px",
                display: "flex", alignItems: "center", gap: 16,
                transition: "transform 0.25s, border-color 0.25s",
              }}
            >
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `radial-gradient(circle, ${item.accent}, transparent 70%)`,
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgb(var(--fg-1))",
                }}
              >
                <Icon name={item.iconName} size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "rgb(var(--fg-1))" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 2 }}>{item.subtitle}</div>
              </div>
              <span style={{ fontSize: 14, color: "rgb(var(--fg-4))" }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
