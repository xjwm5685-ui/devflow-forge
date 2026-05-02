"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import type { WorkflowDefinition } from "@devflow/shared"
import Link from "next/link"

const ACCENTS = [
  "rgba(165,180,252,0.45)",
  "rgba(125,211,252,0.45)",
  "rgba(134,239,172,0.45)",
  "rgba(251,191,36,0.45)",
  "rgba(240,171,252,0.45)",
]

export default function WorkflowsPage() {
  const params = useParams()
  const projectId = String(params.projectId)
  const { data: project } = trpc.project.byId.useQuery({ id: projectId })
  const { data: templates } = trpc.workflow.templates.useQuery()
  const utils = trpc.useUtils()

  const createFromTemplate = trpc.workflow.create.useMutation({
    onSuccess: () => utils.project.byId.invalidate({ id: projectId }),
  })

  const workflows = project?.workflows ?? []

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280, position: "relative" }}>
      <div className="orb" style={{ width: 460, height: 460, top: -160, left: 100, background: "radial-gradient(circle, rgba(165,180,252,0.45), transparent 70%)" }} />

      <Link href={`/dashboard/projects/${projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", marginBottom: 18 }}>
        ← <span>BACK · {project?.name ?? "project"}</span>
      </Link>

      <div className="reveal mb-10">
        <span className="eyebrow">Workflows</span>
        <h1 className="headline" style={{ fontSize: 56, marginTop: 8, lineHeight: 1.0 }}>
          Compose your <em>agent</em> pipeline
        </h1>
        <p style={{ color: "rgb(var(--fg-3))", fontSize: 13.5, marginTop: 12, maxWidth: 600, lineHeight: 1.6 }}>
          每个工作流都是一条节点流：从触发器开始，经过架构师、编码、QA、运维等智能体节点，最终汇成一份产出。
        </p>
      </div>

      {workflows.length > 0 && (
        <section className="mb-12">
          <div className="flex items-end justify-between mb-4">
            <div>
              <span className="eyebrow">Active</span>
              <h2 className="headline" style={{ fontSize: 28, marginTop: 4 }}>
                已有 <em style={{ fontFamily: "var(--font-display)" }}>flows</em>
              </h2>
            </div>
            <span className="chip">{workflows.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
            {workflows.map((wf: any, i: number) => {
              const def = typeof wf.definition === "string" ? JSON.parse(wf.definition) : wf.definition
              const accent = ACCENTS[i % ACCENTS.length]
              return (
                <Link
                  key={wf.id}
                  href={`/dashboard/projects/${projectId}/workflows/${wf.id}`}
                  className="reveal glass glass-edge glass-spot"
                  style={{ padding: 0, position: "relative", overflow: "hidden", animationDelay: `${i * 60}ms`, transition: "transform 0.3s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)" }}
                >
                  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 80% at 100% 0%, ${accent}, transparent 60%)`, opacity: 0.5, pointerEvents: "none" }} />
                  <div style={{ position: "relative", padding: 22 }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="font-display-italic" style={{ fontSize: 22 }}>{wf.name}</div>
                      <span className="chip">{def.nodes?.length ?? 0} nodes</span>
                    </div>
                    <p className="line-clamp-2" style={{ fontSize: 12.5, color: "rgb(var(--fg-3))", marginBottom: 14, minHeight: 36, lineHeight: 1.55 }}>
                      {wf.description || "（暂无描述）"}
                    </p>
                    <div className="flex items-center flex-wrap gap-1.5">
                      {def.nodes?.slice(0, 6).map((node: { id: string; data: { label: string }; type: string }, j: number) => (
                        <span key={node.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              padding: "3px 9px",
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
                          {j < Math.min(def.nodes.length, 6) - 1 && <span style={{ color: "rgb(var(--fg-4))", fontSize: 10 }}>›</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="eyebrow">Templates</span>
            <h2 className="headline" style={{ fontSize: 28, marginTop: 4 }}>
              从模板 <em style={{ fontFamily: "var(--font-display)" }}>fabricate</em>
            </h2>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
          {templates?.filter((t: any) => t.isTemplate).map((template: any, i: number) => {
            const def = typeof template.definition === "string" ? JSON.parse(template.definition) : template.definition
            const accent = ACCENTS[i % ACCENTS.length]
            return (
              <div key={template.id} className="reveal glass glass-edge" style={{ padding: 0, position: "relative", overflow: "hidden", animationDelay: `${i * 60}ms` }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 100% at 0% 0%, ${accent}, transparent 60%)`, opacity: 0.45, pointerEvents: "none" }} />
                <div style={{ position: "relative", padding: 20 }}>
                  <div className="font-display-italic" style={{ fontSize: 20, marginBottom: 6 }}>{template.name}</div>
                  <p className="line-clamp-2" style={{ fontSize: 12, color: "rgb(var(--fg-3))", lineHeight: 1.55, minHeight: 36, marginBottom: 14 }}>
                    {template.description ?? "—"}
                  </p>
                  <div className="flex items-center flex-wrap gap-1.5 mb-4">
                    {def.nodes?.slice(0, 4).map((n: { id: string; data: { label: string } }) => (
                      <span key={n.id} className="chip" style={{ padding: "2px 8px", fontSize: 10 }}>{n.data.label}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => createFromTemplate.mutate({
                      name: template.name,
                      description: template.description ?? undefined,
                      projectId,
                      definition: template.definition as WorkflowDefinition,
                    })}
                    disabled={createFromTemplate.isPending}
                    className="btn btn-glass"
                    style={{ width: "100%" }}
                  >
                    {createFromTemplate.isPending ? "创建中…" : "使用此模板"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
