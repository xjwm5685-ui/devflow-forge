"use client"

import { trpc } from "@/lib/trpc/client"
import { Icon } from "@/components/shared/icon"
import { useState } from "react"
import { useRouter } from "next/navigation"

const TEMPLATE_META: Record<string, { iconName: string; color: string; desc: string }> = {
  refactor: { iconName: "refactor", color: "#6366f1", desc: "自动代码重构：架构分析 → 代码生成 → 测试验证" },
  deploy: { iconName: "deploy", color: "#22c55e", desc: "一键部署：构建 → 测试 → 容器化 → 上线" },
  docs: { iconName: "docs", color: "#eab308", desc: "智能文档：代码分析 → 文档生成 → 图表绘制" },
}

export default function TemplatesPage() {
  const { data: templates } = trpc.workflow.templates.useQuery()
  const { data: projects } = trpc.project.list.useQuery()
  const createWorkflow = trpc.workflow.create.useMutation()
  const router = useRouter()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [creating, setCreating] = useState<string | null>(null)

  const handleUseTemplate = (templateId: string, templateName: string, definition: string) => {
    if (!projects || projects.length === 0) {
      alert("请先创建一个项目")
      return
    }
    if (projects.length === 1) {
      // Auto-select the only project
      const def = JSON.parse(definition)
      createWorkflow.mutate({
        name: templateName,
        projectId: projects[0]!.id,
        definition: def,
      }, {
        onSuccess: (data) => {
          router.push(`/dashboard/projects/${projects[0]!.id}/workflows/${data.id}`)
        },
      })
      return
    }
    setSelectedProject(templateId)
  }

  const confirmCreate = (templateId: string, templateName: string, definition: string, projectId: string) => {
    setCreating(templateId)
    const def = JSON.parse(definition)
    createWorkflow.mutate({
      name: templateName,
      projectId,
      definition: def,
    }, {
      onSuccess: (data) => {
        router.push(`/dashboard/projects/${projectId}/workflows/${data.id}`)
      },
      onError: () => {
        setCreating(null)
        setSelectedProject(null)
      },
    })
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">工作流模板</h1>
        <p className="text-sm text-zinc-500 mt-1">预置的通用工作流，一键使用</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {templates?.filter(t => t.isTemplate).map((template) => {
          const meta = TEMPLATE_META[template.templateTag ?? ""] ?? { iconName: "template", color: "#71717a", desc: template.description ?? "自定义工作流" }
          const def = JSON.parse(template.definition)
          return (
            <div key={template.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  <Icon name={meta.iconName} size={20} />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-zinc-100">{template.name}</h3>
                  <p className="text-[11px] text-zinc-600">{def.nodes?.length ?? 0} 个步骤</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mb-4 line-clamp-2">{meta.desc}</p>
              <div className="flex items-center gap-1.5 mb-4">
                {def.nodes?.map((node: { id: string; data: { label: string }; type: string }, i: number) => (
                  <div key={node.id} className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${node.type === "trigger" ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500/10 text-indigo-400"}`}>{node.data.label}</span>
                    {i < def.nodes.length - 1 && <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                  </div>
                ))}
              </div>

              {selectedProject === template.id ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">选择项目：</p>
                  {projects?.map((p) => (
                    <button key={p.id} onClick={() => confirmCreate(template.id, template.name, template.definition, p.id)}
                      disabled={creating === template.id}
                      className="w-full text-left px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-[13px] text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-50">
                      {p.name}
                    </button>
                  ))}
                  <button onClick={() => setSelectedProject(null)} className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-300">取消</button>
                </div>
              ) : (
                <button onClick={() => handleUseTemplate(template.id, template.name, template.definition)}
                  disabled={createWorkflow.isPending}
                  className="w-full py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md hover:text-zinc-100 hover:bg-zinc-700 transition-colors text-[13px] font-medium disabled:opacity-50">
                  使用模板
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
