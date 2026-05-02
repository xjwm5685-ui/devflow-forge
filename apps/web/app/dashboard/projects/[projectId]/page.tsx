"use client"

import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/lib/trpc/types"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/shared/icon"

type ProjectDetail = NonNullable<RouterOutputs["project"]["byId"]>
type ProjectWorkflow = ProjectDetail["workflows"][number]
type ProjectTask = ProjectDetail["tasks"][number]

const TABS = [
  { label: "概览", english: "Overview", href: "" },
  { label: "工作流", english: "Workflows", href: "/workflows" },
  { label: "文档", english: "Documents", href: "/documents" },
  { label: "部署", english: "Deployments", href: "/deployments" },
] as const

const STATUS_TONE: Record<string, { bg: string; fg: string; ring: string }> = {
  COMPLETED: { bg: "rgba(134,239,172,0.14)", fg: "rgb(134 239 172)", ring: "rgba(134,239,172,0.32)" },
  RUNNING:   { bg: "rgba(165,180,252,0.16)", fg: "rgb(165 180 252)", ring: "rgba(165,180,252,0.32)" },
  FAILED:    { bg: "rgba(248,113,113,0.14)", fg: "rgb(248 113 113)", ring: "rgba(248,113,113,0.30)" },
  PENDING:   { bg: "rgba(255,255,255,0.05)", fg: "rgb(var(--fg-3))",  ring: "rgba(255,255,255,0.10)" },
}

function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.PENDING
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px",
      borderRadius: 999,
      fontSize: 10.5,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.06em",
      color: tone.fg,
      background: tone.bg,
      border: `1px solid ${tone.ring}`,
    }}>
      {status === "RUNNING" && <span className="dot dot-pulse" style={{ background: tone.fg, color: tone.fg }} />}
      {status}
    </span>
  )
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { data: project, isLoading } = trpc.project.byId.useQuery({ id: projectId })

  if (isLoading) {
    return (
      <div style={{ padding: "40px 48px" }}>
        <div className="space-y-4">
          <div className="skeleton" style={{ height: 32, width: "33%" }} />
          <div className="skeleton" style={{ height: 16, width: "66%" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 32 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        <h1 className="headline" style={{ fontSize: 36, marginBottom: 12 }}>Not <em>found.</em></h1>
        <p style={{ color: "rgb(var(--fg-3))", marginBottom: 24 }}>这个项目不存在或已被删除。</p>
        <Link href="/dashboard/projects" className="btn btn-glass">返回项目</Link>
      </div>
    )
  }

  const stats = [
    { href: `/dashboard/projects/${projectId}/workflows`,  count: project.workflows.length,  label: "Workflows",   accent: "rgba(165,180,252,0.45)" },
    { href: undefined,                                       count: project.tasks.length,      label: "Tasks",       accent: "rgba(255,255,255,0.18)" },
    { href: `/dashboard/projects/${projectId}/deployments`, count: project.deployments.length, label: "Deployments", accent: "rgba(134,239,172,0.45)" },
    { href: `/dashboard/projects/${projectId}/documents`,   count: project.documents.length,  label: "Documents",   accent: "rgba(251,191,36,0.45)" },
  ]

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280, position: "relative" }}>
      <div className="orb" style={{ width: 460, height: 460, top: -160, left: 200, background: "radial-gradient(circle, rgba(240,171,252,0.45), transparent 70%)" }} />

      {/* Header */}
      <div className="reveal" style={{ position: "relative", marginBottom: 28 }}>
        <Link href="/dashboard/projects" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", marginBottom: 18 }}>
          ← <span>BACK · projects</span>
        </Link>
        <div className="flex items-end gap-6">
          <div className="flex-1">
            <span className="eyebrow">Project</span>
            <h1 className="headline" style={{ fontSize: 56, marginTop: 6, lineHeight: 1.02 }}>
              {project.name}
            </h1>
            {project.description && (
              <p style={{ color: "rgb(var(--fg-3))", fontSize: 14, marginTop: 14, maxWidth: 640, lineHeight: 1.6 }}>
                {project.description}
              </p>
            )}
            {project.githubRepo && (
              <div className="chip" style={{ marginTop: 14 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                {project.githubRepo}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-soft reveal" style={{ display: "inline-flex", padding: 4, borderRadius: 14, marginBottom: 28, gap: 2, animationDelay: "60ms" }}>
        {TABS.map((tab, i) => {
          const href = `/dashboard/projects/${projectId}${tab.href}`
          const isActive = tab.href === ""
          return (
            <Link
              key={tab.label}
              href={href}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 500,
                color: isActive ? "rgb(8 6 24)" : "rgb(var(--fg-3))",
                background: isActive ? "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(220,220,255,0.85))" : "transparent",
                boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 16px -8px rgba(240,171,252,0.4)" : "none",
                transition: "all 0.25s",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, opacity: 0.5 }}>0{i + 1}</span>
              {tab.label}
              <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 13, opacity: 0.7 }}>{tab.english}</span>
            </Link>
          )
        })}
      </div>

      {/* Stats bento */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 28 }}>
        {stats.map((stat, i) => {
          const Wrapper: typeof Link = stat.href ? Link : ((p: React.ComponentProps<typeof Link>) => <div {...(p as React.HTMLAttributes<HTMLDivElement>)} />) as unknown as typeof Link
          return (
            <Wrapper
              key={stat.label}
              href={stat.href ?? "#"}
              className="glass glass-edge reveal"
              style={{ padding: "20px 22px", position: "relative", overflow: "hidden", animationDelay: `${i * 60}ms`, transition: "transform 0.3s, border-color 0.3s" }}
            >
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 80% at 100% 0%, ${stat.accent}, transparent 70%)`, opacity: 0.6, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div className="headline" style={{ fontSize: 40, fontWeight: 400 }}>{stat.count}</div>
                <div className="eyebrow" style={{ marginTop: 4 }}>{stat.label}</div>
              </div>
            </Wrapper>
          )
        })}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14, marginBottom: 36 }}>
        {[
          { href: `/dashboard/projects/${projectId}/workflows`, label: "运行工作流", subtitle: "Execute AI agent pipeline", iconName: "play",     accent: "rgba(165,180,252,0.5)" },
          { href: `/dashboard/projects/${projectId}/documents`, label: "生成文档",     subtitle: "Diagrams · narration · video", iconName: "docs", accent: "rgba(251,191,36,0.5)" },
          { href: `/dashboard/projects/${projectId}/deployments`, label: "部署",       subtitle: "Push to staging / production", iconName: "deploy", accent: "rgba(134,239,172,0.5)" },
        ].map((action, i) => (
          <Link
            key={action.href}
            href={action.href}
            className="glass glass-edge glass-spot reveal"
            style={{ padding: 22, display: "flex", alignItems: "center", gap: 16, position: "relative", animationDelay: `${240 + i * 60}ms` }}
          >
            <span
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: `radial-gradient(circle, ${action.accent}, transparent 70%)`,
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgb(var(--fg-1))",
              }}
            >
              <Icon name={action.iconName} size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-display-italic" style={{ fontSize: 18 }}>{action.label}</div>
              <div style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 3, letterSpacing: "0.02em" }}>{action.subtitle}</div>
            </div>
            <span style={{ fontSize: 16, color: "rgb(var(--fg-4))" }}>→</span>
          </Link>
        ))}
      </div>

      {/* Workflows */}
      <section style={{ marginBottom: 36 }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="eyebrow">Workflows</span>
            <h2 className="headline" style={{ fontSize: 26, marginTop: 4 }}>
              工作流 <em style={{ fontFamily: "var(--font-display)" }}>pipeline</em>
            </h2>
          </div>
          <Link href={`/dashboard/projects/${projectId}/workflows`} style={{ fontSize: 11.5, color: "rgb(165 180 252)", fontFamily: "var(--font-mono)" }}>VIEW ALL →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
          {project.workflows.slice(0, 4).map((workflow: ProjectWorkflow, i: number) => {
            const def = JSON.parse(workflow.definition)
            return (
              <Link
                key={workflow.id}
                href={`/dashboard/projects/${projectId}/workflows/${workflow.id}`}
                className="glass glass-edge glass-spot reveal"
                style={{ padding: 22, animationDelay: `${i * 50}ms`, transition: "transform 0.3s" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="font-display-italic" style={{ fontSize: 20 }}>{workflow.name}</div>
                  <span className="chip">{def.nodes?.length ?? 0} nodes</span>
                </div>
                <p style={{ fontSize: 13, color: "rgb(var(--fg-3))", marginBottom: 14, minHeight: 20 }}>
                  {workflow.description || "—"}
                </p>
                <div className="flex items-center flex-wrap gap-1">
                  {def.nodes?.slice(0, 5).map((node: { id: string; type: string; data: { label: string } }, j: number) => (
                    <span key={node.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 10.5,
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.04em",
                          color: node.type === "trigger" ? "rgb(var(--fg-3))" : "rgb(165 180 252)",
                          background: node.type === "trigger" ? "rgba(255,255,255,0.05)" : "rgba(165,180,252,0.10)",
                          border: node.type === "trigger" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(165,180,252,0.25)",
                        }}
                      >
                        {node.data.label}
                      </span>
                      {j < Math.min(def.nodes.length, 5) - 1 && (
                        <span style={{ color: "rgb(var(--fg-4))", fontSize: 10 }}>›</span>
                      )}
                    </span>
                  ))}
                </div>
              </Link>
            )
          })}
          {project.workflows.length === 0 && (
            <div className="glass-soft" style={{ gridColumn: "span 2", padding: 32, textAlign: "center", borderStyle: "dashed" }}>
              <div className="font-display-italic" style={{ fontSize: 22, color: "rgb(var(--fg-3))", marginBottom: 6 }}>blank canvas.</div>
              <div style={{ fontSize: 12.5, color: "rgb(var(--fg-4))" }}>从模板库选一个工作流，或者新建一个空白工作流。</div>
            </div>
          )}
        </div>
      </section>

      {/* Recent Tasks */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="eyebrow">Activity</span>
            <h2 className="headline" style={{ fontSize: 26, marginTop: 4 }}>
              最近 <em style={{ fontFamily: "var(--font-display)" }}>tasks</em>
            </h2>
          </div>
        </div>
        <div className="glass glass-edge" style={{ overflow: "hidden" }}>
          {project.tasks.map((task: ProjectTask, i: number) => {
            const input = task.input ? JSON.parse(task.input) : null
            const typeIcon = task.type === "REFACTOR" ? "refactor" : task.type === "GENERATE_DOCS" ? "docs" : task.type === "DEPLOY" ? "deploy" : "bolt"
            const typeAccent = task.type === "REFACTOR" ? "rgba(165,180,252,0.4)" : task.type === "GENERATE_DOCS" ? "rgba(251,191,36,0.4)" : task.type === "DEPLOY" ? "rgba(134,239,172,0.4)" : "rgba(255,255,255,0.15)"
            return (
              <div
                key={task.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 22px",
                  borderBottom: i < project.tasks.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: `radial-gradient(circle, ${typeAccent}, transparent 70%)`,
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgb(var(--fg-1))",
                    }}
                  >
                    <Icon name={typeIcon} size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display-italic truncate" style={{ fontSize: 15 }}>{task.type.replace(/_/g, " ").toLowerCase()}</div>
                    <div className="truncate" style={{ fontSize: 11.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      {input?.prompt
                        ? input.prompt.slice(0, 80) + (input.prompt.length > 80 ? "…" : "")
                        : new Date(task.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {task._count?.tokenUsage > 0 && (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgb(var(--fg-4))" }}>
                      {(task._count.tokenUsage / 1000).toFixed(1)}K
                    </span>
                  )}
                  <StatusPill status={task.status} />
                </div>
              </div>
            )
          })}
          {project.tasks.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "rgb(var(--fg-4))" }}>
              <div className="font-display-italic" style={{ fontSize: 22, marginBottom: 6 }}>未运行。</div>
              <div style={{ fontSize: 12.5 }}>没有最近的任务记录。</div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
