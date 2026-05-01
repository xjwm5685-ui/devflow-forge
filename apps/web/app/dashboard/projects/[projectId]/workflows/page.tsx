"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/shared/icon"

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
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/dashboard/projects/${projectId}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <Icon name="back" size={16} />
            </Link>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">工作流</h1>
          </div>
          <p className="text-sm text-zinc-500">{project?.name} 的工作流</p>
        </div>
      </div>

      {/* Existing workflows */}
      {workflows.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">已有工作流</h2>
          <div className="grid grid-cols-2 gap-4">
            {workflows.map((wf) => {
              const def = JSON.parse(wf.definition)
              return (
                <Link key={wf.id} href={`/dashboard/projects/${projectId}/workflows/${wf.id}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors group">
                  <h3 className="text-[13px] font-semibold text-zinc-100 mb-1 group-hover:text-indigo-400 transition-colors">{wf.name}</h3>
                  <p className="text-xs text-zinc-500 mb-3">{wf.description || "暂无描述"}</p>
                  <div className="flex items-center gap-1.5">
                    {def.nodes?.slice(0, 5).map((node: { id: string; data: { label: string }; type: string }, i: number) => (
                      <div key={node.id} className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${node.type === "trigger" ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500/10 text-indigo-400"}`}>{node.data.label}</span>
                        {i < Math.min(def.nodes.length, 5) - 1 && <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                      </div>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Create from template */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">从模板创建</h2>
        <div className="grid grid-cols-3 gap-4">
          {templates?.filter(t => t.isTemplate).map((template) => {
            const def = JSON.parse(template.definition)
            return (
              <div key={template.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <h3 className="text-[13px] font-semibold text-zinc-100 mb-1">{template.name}</h3>
                <p className="text-xs text-zinc-500 mb-3">{template.description}</p>
                <div className="flex items-center gap-1 mb-4">
                  {def.nodes?.slice(0, 4).map((n: { id: string; data: { label: string } }) => (
                    <span key={n.id} className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500">{n.data.label}</span>
                  ))}
                </div>
                <button
                  onClick={() => createFromTemplate.mutate({
                    name: template.name,
                    description: template.description ?? undefined,
                    projectId,
                    definition: JSON.parse(template.definition),
                  })}
                  disabled={createFromTemplate.isPending}
                  className="w-full py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-md hover:bg-indigo-600/20 transition-colors text-[13px] font-medium disabled:opacity-50"
                >
                  {createFromTemplate.isPending ? "创建中..." : "使用此模板"}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
