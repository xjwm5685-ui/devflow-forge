"use client"

import { trpc } from "@/lib/trpc/client"
import { useRouter } from "next/navigation"

const TEMPLATE_META: Record<string, { icon: string; color: string; desc: string }> = {
  refactor: { icon: "🔄", color: "#6366f1", desc: "自动代码重构：架构分析 → 代码生成 → 测试验证" },
  deploy: { icon: "🚀", color: "#22c55e", desc: "一键部署：构建 → 测试 → 容器化 → 上线" },
  docs: { icon: "📝", color: "#eab308", desc: "智能文档：代码分析 → 文档生成 → 图表绘制" },
}

export default function TemplatesPage() {
  const { data: templates } = trpc.workflow.templates.useQuery()
  const router = useRouter()

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">工作流模板</h1>
        <p className="text-sm text-text-tertiary mt-1">预置的通用工作流，一键使用</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {templates?.map((template) => {
          const meta = TEMPLATE_META[template.templateTag ?? ""] ?? { icon: "⚙️", color: "#71717a", desc: template.description ?? "自定义工作流" }
          const def = JSON.parse(template.definition)

          return (
            <div key={template.id} className="bg-surface-1 border border-surface-border rounded-lg p-5 hover:border-surface-border-light transition-colors">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${meta.color}15` }}>
                  {meta.icon}
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-text-primary">{template.name}</h3>
                  <p className="text-[11px] text-text-muted">{def.nodes?.length ?? 0} 个步骤</p>
                </div>
              </div>

              <p className="text-xs text-text-secondary mb-4 line-clamp-2">{meta.desc}</p>

              <div className="flex items-center gap-1.5 mb-4">
                {def.nodes?.map((node: { id: string; data: { label: string }; type: string }, i: number) => (
                  <div key={node.id} className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      node.type === "trigger" ? "bg-surface-3 text-text-muted" : "bg-accent-dim text-accent-light"
                    }`}>{node.data.label}</span>
                    {i < def.nodes.length - 1 && <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                  </div>
                ))}
              </div>

              <button onClick={() => router.push("/dashboard/projects")} className="w-full py-2 bg-surface-2 border border-surface-border text-text-secondary rounded-md hover:text-text-primary hover:bg-surface-3 transition-colors text-[13px] font-medium">
                使用模板
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
