"use client"

import { trpc } from "@/lib/trpc/client"
import { useRouter } from "next/navigation"

export default function TemplatesPage() {
  const { data: templates } = trpc.workflow.templates.useQuery()
  const router = useRouter()

  const templateMeta: Record<string, { icon: string; color: string; description: string }> = {
    refactor: {
      icon: "🔄",
      color: "indigo",
      description: "Automated code refactoring with architecture analysis, implementation, and testing",
    },
    deploy: {
      icon: "🚀",
      color: "emerald",
      description: "Build, test, containerize, and deploy your application with one click",
    },
    docs: {
      icon: "📝",
      color: "amber",
      description: "Generate comprehensive documentation with diagrams and audio narration",
    },
  }

  const colorMap: Record<string, string> = {
    indigo: "#6366f1",
    emerald: "#10b981",
    amber: "#f59e0b",
    gray: "#6b7280",
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Workflow Templates</h1>
        <p className="text-gray-400 mt-1">Pre-built workflows for common development tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => {
          const meta = templateMeta[template.templateTag ?? ""] ?? {
            icon: "⚙️",
            color: "gray",
            description: template.description ?? "Custom workflow template",
          }

          const def = JSON.parse(template.definition)
          const nodeCount = def.nodes?.length ?? 0

          return (
            <div
              key={template.id}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${colorMap[meta.color] ?? '#6b7280'}20` }}
                >
                  {meta.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{nodeCount} steps</p>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                {meta.description}
              </p>

              {/* Mini workflow preview */}
              <div className="flex items-center gap-2 mb-4">
                {def.nodes?.map((node: { id: string; type: string; data: { label: string } }, i: number) => (
                  <div key={node.id} className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-[10px] font-medium ${
                      node.type === "trigger" ? "bg-gray-700 text-gray-300" :
                      node.type === "agent" ? "bg-indigo-900/50 text-indigo-300 border border-indigo-800" :
                      "bg-gray-700 text-gray-300"
                    }`}>
                      {node.data.label}
                    </div>
                    {i < def.nodes.length - 1 && (
                      <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              <button
                className="w-full py-2 bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/20 transition-colors text-sm font-medium"
                onClick={() => {
                  // Navigate to create project with this template
                  router.push("/dashboard/projects")
                }}
              >
                Use Template
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
