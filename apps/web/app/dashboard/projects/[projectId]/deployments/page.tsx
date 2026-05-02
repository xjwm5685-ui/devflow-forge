"use client"

import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/lib/trpc/types"
import { useParams } from "next/navigation"
import Link from "next/link"

type Deployment = RouterOutputs["deployment"]["list"][number]

const STAGES = ["PENDING", "BUILDING", "PUSHING", "DEPLOYING", "RUNNING"] as const

const STAGE_LABELS: Record<string, string> = {
  PENDING: "排队",
  BUILDING: "构建",
  PUSHING: "推送",
  DEPLOYING: "部署",
  RUNNING: "运行",
}

function StatusTag({ status }: { status: string }) {
  const tone = status === "RUNNING"
    ? { bg: "rgba(134,239,172,0.16)", fg: "rgb(134 239 172)", ring: "rgba(134,239,172,0.32)" }
    : status === "FAILED"
    ? { bg: "rgba(248,113,113,0.16)", fg: "rgb(248 113 113)", ring: "rgba(248,113,113,0.32)" }
    : { bg: "rgba(251,191,36,0.16)", fg: "rgb(251 191 36)", ring: "rgba(251,191,36,0.32)" }
  const isInflight = !["RUNNING", "FAILED", "STOPPED"].includes(status)
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 999, fontSize: 10.5,
      fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
      color: tone.fg, background: tone.bg, border: `1px solid ${tone.ring}`,
    }}>
      {isInflight && <span className="dot dot-pulse" style={{ background: tone.fg, color: tone.fg }} />}
      {status}
    </span>
  )
}

export default function DeploymentsPage() {
  const params = useParams()
  const projectId = String(params.projectId)
  const { data: deployments, refetch } = trpc.deployment.list.useQuery(
    { projectId },
    {
      refetchInterval: (query) => {
        const items = query.state.data
        if (!items || items.some((d: Deployment) => ["PENDING", "BUILDING", "PUSHING", "DEPLOYING"].includes(d.status))) {
          return 2000
        }
        return false
      },
    }
  )
  const createDeploy = trpc.deployment.create.useMutation({ onSuccess: () => refetch() })

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280, position: "relative" }}>
      <div className="orb" style={{ width: 420, height: 420, top: -100, right: 80, background: "radial-gradient(circle, rgba(134,239,172,0.42), transparent 70%)" }} />

      <Link href={`/dashboard/projects/${projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", marginBottom: 18 }}>
        ← <span>BACK · project</span>
      </Link>

      <div className="reveal flex items-end justify-between mb-8" style={{ position: "relative" }}>
        <div>
          <span className="eyebrow">Deployments</span>
          <h1 className="headline" style={{ fontSize: 56, marginTop: 8, lineHeight: 1.0 }}>
            Ship to <em>staging</em>
          </h1>
          <p style={{ color: "rgb(var(--fg-3))", fontSize: 13.5, marginTop: 12, maxWidth: 540, lineHeight: 1.6 }}>
            构建 Docker 镜像，启动本地容器，并实时跟踪每一步流水线状态。失败时一键回看完整日志。
          </p>
        </div>
        <button
          onClick={() => createDeploy.mutate({ projectId, environment: "staging", provider: "docker-local" })}
          disabled={createDeploy.isPending}
          className="btn btn-aurora flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M12 4v16" /></svg>
          {createDeploy.isPending ? "排队中…" : "部署到 Staging"}
        </button>
      </div>

      <div className="space-y-4">
        {deployments?.map((deploy: Deployment, idx: number) => {
          const currentStageIndex = STAGES.indexOf(deploy.status as typeof STAGES[number])
          const logs: string[] = deploy.logs ? JSON.parse(deploy.logs) : []
          const isFailed = deploy.status === "FAILED"

          return (
            <div key={deploy.id} className="reveal glass glass-edge" style={{ padding: 0, animationDelay: `${idx * 60}ms`, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px" }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-display-italic" style={{ fontSize: 22 }}>{deploy.environment}</h3>
                      <StatusTag status={deploy.status} />
                    </div>
                    <p style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                      {new Date(deploy.createdAt).toLocaleString("zh-CN")} · {deploy.id.slice(0, 8)}
                    </p>
                  </div>
                  {deploy.url && (
                    <a href={deploy.url} target="_blank" rel="noopener noreferrer" className="btn btn-glass" style={{ fontSize: 12, padding: "6px 12px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M14 3h7v7M21 3l-9 9M10 14H4a1 1 0 01-1-1V6a1 1 0 011-1h6" /></svg>
                      打开 URL
                    </a>
                  )}
                </div>

                {/* Pipeline visualization */}
                <div className="flex items-center gap-1.5" style={{ marginBottom: logs.length > 0 ? 16 : 0 }}>
                  {STAGES.map((stage, i) => {
                    const isComplete = i < currentStageIndex || deploy.status === "RUNNING"
                    const isCurrent = i === currentStageIndex && deploy.status !== "RUNNING"
                    const failedHere = isFailed && i === currentStageIndex
                    return (
                      <div key={stage} className="flex items-center gap-1.5" style={{ flex: 1 }}>
                        <div
                          style={{
                            flex: 1,
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "8px 12px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.04em",
                            color: failedHere ? "rgb(var(--bad))" : isComplete ? "rgb(var(--good))" : isCurrent ? "rgb(var(--warn))" : "rgb(var(--fg-4))",
                            background: failedHere
                              ? "rgba(248,113,113,0.10)"
                              : isComplete
                              ? "rgba(134,239,172,0.10)"
                              : isCurrent
                              ? "rgba(251,191,36,0.10)"
                              : "rgba(255,255,255,0.03)",
                            border: failedHere
                              ? "1px solid rgba(248,113,113,0.25)"
                              : isComplete
                              ? "1px solid rgba(134,239,172,0.20)"
                              : isCurrent
                              ? "1px solid rgba(251,191,36,0.25)"
                              : "1px solid rgba(255,255,255,0.06)",
                            transition: "all 0.4s",
                          }}
                        >
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500 }}>
                            {STAGE_LABELS[stage]}
                          </span>
                          {isCurrent && !isFailed && (
                            <span className="dot dot-pulse" style={{ marginLeft: "auto", background: "rgb(var(--warn))", color: "rgb(var(--warn))" }} />
                          )}
                          {isComplete && !isCurrent && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ marginLeft: "auto" }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {i < STAGES.length - 1 && (
                          <span style={{ width: 8, height: 1, background: "rgba(255,255,255,0.08)" }} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Logs */}
                {logs.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", padding: "6px 0", outline: "none" }}>
                      ▾ {logs.length} 行日志
                    </summary>
                    <div className="code-pane" style={{ marginTop: 8, maxHeight: 280, overflowY: "auto" }}>
                      {logs.map((log: string, i: number) => (
                        <div key={i} style={{ padding: "1px 0", color: log.toLowerCase().includes("fail") || log.toLowerCase().includes("error") ? "rgb(var(--bad))" : "rgb(var(--fg-3))" }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {deploy.dockerImage && (
                  <div className="flex items-center gap-2 mt-3" style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>
                    <span className="chip" style={{ padding: "2px 8px", fontSize: 10 }}>image</span>
                    <span>{deploy.dockerImage}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {(!deployments || deployments.length === 0) && (
          <div className="reveal glass-soft" style={{ padding: 56, textAlign: "center", borderStyle: "dashed" }}>
            <div className="font-display-italic" style={{ fontSize: 28, color: "rgb(var(--fg-2))", marginBottom: 6 }}>nothing shipped yet.</div>
            <div style={{ fontSize: 13, color: "rgb(var(--fg-4))" }}>
              点击右上角的<span style={{ color: "rgb(var(--good))" }}> 部署到 Staging </span>启动第一次部署。
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
