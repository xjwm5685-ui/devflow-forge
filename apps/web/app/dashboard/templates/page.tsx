"use client"

import { trpc } from "@/lib/trpc/client"
import type { WorkflowDefinition } from "@devflow/shared"
import { Icon } from "@/components/shared/icon"
import { CustomSelect } from "@/components/ui/custom-select"
import { useState } from "react"
import { useRouter } from "next/navigation"

const TEMPLATE_META: Record<string, { iconName: string; accent: string; gradient: string; desc: string }> = {
  refactor: {
    iconName: "refactor",
    accent: "rgb(165 180 252)",
    gradient: "rgba(165,180,252,0.55)",
    desc: "自动代码重构：架构分析 → 代码生成 → 测试验证",
  },
  deploy: {
    iconName: "deploy",
    accent: "rgb(134 239 172)",
    gradient: "rgba(134,239,172,0.55)",
    desc: "一键部署：构建 → 测试 → 容器化 → 上线",
  },
  docs: {
    iconName: "docs",
    accent: "rgb(251 191 36)",
    gradient: "rgba(251,191,36,0.55)",
    desc: "智能文档：代码分析 → 文档生成 → 图表绘制",
  },
  custom: {
    iconName: "template",
    accent: "rgb(125 211 252)",
    gradient: "rgba(125,211,252,0.55)",
    desc: "你保存的自定义工作流模板",
  },
}

const BLANK_DEFINITION = {
  nodes: [
    { id: "trigger-1", type: "trigger" as const, position: { x: 250, y: 0 }, data: { type: "trigger" as const, label: "Start" } },
  ],
  edges: [] as Array<{ id: string; source: string; target: string; type?: string; animated?: boolean }>,
}

export default function TemplatesPage() {
  const utils = trpc.useUtils()
  const { data: user } = trpc.user.me.useQuery()
  const { data: templates } = trpc.workflow.templates.useQuery()
  const { data: projects } = trpc.project.list.useQuery()
  const createWorkflow = trpc.workflow.create.useMutation()
  const deleteWorkflow = trpc.workflow.delete.useMutation({
    onSuccess: () => utils.workflow.templates.invalidate(),
  })
  const router = useRouter()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newProjectId, setNewProjectId] = useState("")

  const myTemplates = templates?.filter((t: any) => t.project?.userId === user?.id && t.templateTag === "custom") ?? []
  const builtInTemplates = templates?.filter((t: any) => t.templateTag !== "custom") ?? []

  const handleUseTemplate = (templateId: string, templateName: string, definition: WorkflowDefinition) => {
    if (!projects || projects.length === 0) {
      alert("请先创建一个项目")
      return
    }
    if (projects.length === 1) {
      createWorkflow.mutate({
        name: templateName,
        projectId: projects[0]!.id,
        definition,
      }, {
        onSuccess: (data) => router.push(`/dashboard/projects/${projects[0]!.id}/workflows/${data.id}`),
      })
      return
    }
    setSelectedProject(templateId)
  }

  const confirmCreate = (templateId: string, templateName: string, definition: WorkflowDefinition, projectId: string) => {
    setCreating(templateId)
    createWorkflow.mutate({
      name: templateName, projectId, definition,
    }, {
      onSuccess: (data) => router.push(`/dashboard/projects/${projectId}/workflows/${data.id}`),
      onError: () => { setCreating(null); setSelectedProject(null) },
    })
  }

  function createBlankTemplate() {
    const projectId = newProjectId || projects?.[0]?.id
    if (!projectId || !newName.trim()) return

    createWorkflow.mutate({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      projectId,
      definition: BLANK_DEFINITION,
      isTemplate: true,
      templateTag: "custom",
    }, {
      onSuccess: () => {
        utils.workflow.templates.invalidate()
        setNewOpen(false); setNewName(""); setNewDescription("")
      },
    })
  }

  const renderTemplate = (template: NonNullable<typeof templates>[number], idx: number) => {
    const meta = TEMPLATE_META[template.templateTag ?? ""] ?? TEMPLATE_META.custom!
    const def = template.definition
    const isMine = template.project?.userId === user?.id && template.templateTag === "custom"

    return (
      <div key={template.id} className="reveal glass glass-edge glass-spot" style={{ padding: 0, animationDelay: `${idx * 50}ms`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 100% at 0% 0%, ${meta.gradient}, transparent 60%)`, opacity: 0.45, pointerEvents: "none" }} />
        <div style={{ position: "relative", padding: 22 }}>
          <div className="flex items-start gap-3 mb-4">
            <span
              className="flex items-center justify-center"
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: `radial-gradient(circle, ${meta.gradient}, transparent 70%)`,
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                color: meta.accent,
              }}
            >
              <Icon name={meta.iconName} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display-italic truncate" style={{ fontSize: 20 }}>{template.name}</h3>
              <p style={{ fontSize: 10.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                {def.nodes?.length ?? 0} STEPS
              </p>
            </div>
          </div>
          <p className="line-clamp-2" style={{ fontSize: 12.5, color: "rgb(var(--fg-3))", lineHeight: 1.55, minHeight: 36, marginBottom: 14 }}>
            {template.description || meta.desc}
          </p>

          <div className="flex items-center flex-wrap gap-1.5 mb-4">
            {def.nodes?.slice(0, 4).map((node: { id: string; data: { label: string }; type: string }, i: number) => (
              <span key={node.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    color: node.type === "trigger" ? "rgb(var(--fg-3))" : meta.accent,
                    background: node.type === "trigger" ? "rgba(255,255,255,0.05)" : `${meta.gradient.replace("0.55", "0.10")}`,
                    border: node.type === "trigger" ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${meta.gradient.replace("0.55", "0.25")}`,
                  }}
                >
                  {node.data.label}
                </span>
                {i < Math.min(def.nodes.length, 4) - 1 && <span style={{ color: "rgb(var(--fg-4))", fontSize: 10 }}>›</span>}
              </span>
            ))}
          </div>

          {selectedProject === template.id ? (
            <div className="space-y-2">
              <div className="eyebrow" style={{ marginBottom: 4 }}>选择项目</div>
              {projects?.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => confirmCreate(template.id, template.name, template.definition, p.id)}
                  disabled={creating === template.id}
                  className="glass-soft glass-spot"
                  style={{ width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 12.5, color: "rgb(var(--fg-1))", cursor: "pointer" }}
                >
                  {p.name}
                </button>
              ))}
              <button onClick={() => setSelectedProject(null)} className="btn btn-ghost" style={{ width: "100%", fontSize: 11 }}>取消</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleUseTemplate(template.id, template.name, template.definition)}
                disabled={createWorkflow.isPending}
                className="btn btn-glass"
                style={{ flex: 1, fontSize: 12.5 }}
              >
                使用模板
              </button>
              {isMine && (
                <button
                  onClick={() => deleteWorkflow.mutate({ id: template.id })}
                  className="btn"
                  style={{
                    fontSize: 11, padding: "6px 12px",
                    background: "rgba(248,113,113,0.10)",
                    color: "rgb(248 113 113)",
                    border: "1px solid rgba(248,113,113,0.22)",
                  }}
                >
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280, position: "relative" }}>
      <div className="orb" style={{ width: 460, height: 460, top: -150, right: 100, background: "radial-gradient(circle, rgba(125,211,252,0.4), transparent 70%)" }} />

      <div className="reveal flex items-end justify-between mb-10">
        <div>
          <span className="eyebrow">Templates · 工作流模板</span>
          <h1 className="headline" style={{ fontSize: 56, marginTop: 8, lineHeight: 1.0 }}>
            Pre-cast <em>flows</em>
          </h1>
          <p style={{ color: "rgb(var(--fg-3))", fontSize: 13.5, marginTop: 12, maxWidth: 540, lineHeight: 1.6 }}>
            从内置模板挑一个开始，或者把现有工作流保存成可复用模板。
          </p>
        </div>
        <button onClick={() => setNewOpen((open) => !open)} className="btn btn-aurora flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
          新建空白模板
        </button>
      </div>

      {newOpen && (
        <div className="reveal glass glass-edge" style={{ padding: 28, marginBottom: 28 }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className="eyebrow">New blank</span>
              <h2 className="headline" style={{ fontSize: 24, marginTop: 4 }}>
                空白 <em style={{ fontFamily: "var(--font-display)" }}>canvas</em>
              </h2>
            </div>
            <button onClick={() => setNewOpen(false)} className="btn btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }}>关闭</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>模板名称</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="My template" />
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>描述</label>
              <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="input" placeholder="一句话简介" />
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>挂载项目</label>
              <CustomSelect
                value={newProjectId}
                onChange={setNewProjectId}
                placeholder="选择项目"
                options={[
                  { value: "", label: "选择项目" },
                  ...(projects?.map((project: any) => ({ value: project.id, label: project.name })) ?? []),
                ]}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={createBlankTemplate} disabled={!newName.trim() || createWorkflow.isPending} className="btn btn-aurora">
              {createWorkflow.isPending ? "创建中…" : "创建"}
            </button>
            <button onClick={() => setNewOpen(false)} className="btn btn-ghost">取消</button>
          </div>
        </div>
      )}

      {myTemplates.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <span className="eyebrow">Yours</span>
              <h2 className="headline" style={{ fontSize: 28, marginTop: 4 }}>
                我的 <em style={{ fontFamily: "var(--font-display)" }}>templates</em>
              </h2>
            </div>
            <span className="chip">{myTemplates.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
            {myTemplates.map((t: any, i: number) => renderTemplate(t, i))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="eyebrow">Built-in</span>
            <h2 className="headline" style={{ fontSize: 28, marginTop: 4 }}>
              内置 <em style={{ fontFamily: "var(--font-display)" }}>presets</em>
            </h2>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
          {builtInTemplates.map((t: any, i: number) => renderTemplate(t, i))}
        </div>
      </section>
    </div>
  )
}
