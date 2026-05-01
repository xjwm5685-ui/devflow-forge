"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/shared/icon"

const TABS = [
  { label: "Overview", href: "" },
  { label: "Workflows", href: "/workflows" },
  { label: "Documents", href: "/documents" },
  { label: "Deployments", href: "/deployments" },
]

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { data: project, isLoading } = trpc.project.byId.useQuery({ id: projectId })

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-800 rounded w-2/3" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Project Not Found</h1>
        <Link href="/dashboard/projects" className="text-indigo-400 hover:underline">
          Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard/projects" className="text-gray-500 hover:text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        </div>
        <p className="text-gray-400 ml-8">{project.description}</p>
        {project.githubRepo && (
          <p className="text-sm text-gray-500 mt-1 ml-8 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {project.githubRepo}
          </p>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 mb-8 border-b border-gray-800 pb-px">
        {TABS.map((tab) => {
          const href = `/dashboard/projects/${projectId}${tab.href}`
          const isActive = tab.href === ""
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? "text-white bg-gray-900/50 border border-gray-800 border-b-transparent -mb-px"
                  : "text-gray-400 hover:text-white hover:bg-gray-900/30"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href={`/dashboard/projects/${projectId}/workflows`} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-indigo-600/30 transition-colors">
          <div className="text-2xl font-bold text-white">{project.workflows.length}</div>
          <div className="text-xs text-gray-500">Workflows</div>
        </Link>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{project.tasks.length}</div>
          <div className="text-xs text-gray-500">Tasks</div>
        </div>
        <Link href={`/dashboard/projects/${projectId}/deployments`} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-emerald-600/30 transition-colors">
          <div className="text-2xl font-bold text-white">{project.deployments.length}</div>
          <div className="text-xs text-gray-500">Deployments</div>
        </Link>
        <Link href={`/dashboard/projects/${projectId}/documents`} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-amber-600/30 transition-colors">
          <div className="text-2xl font-bold text-white">{project.documents.length}</div>
          <div className="text-xs text-gray-500">Documents</div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href={`/dashboard/projects/${projectId}/workflows`}
          className="flex items-center gap-4 bg-indigo-600/10 border border-indigo-600/20 rounded-xl p-5 hover:bg-indigo-600/15 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Run Workflow</div>
            <div className="text-xs text-gray-400">Execute AI agent pipeline</div>
          </div>
        </Link>
        <Link
          href={`/dashboard/projects/${projectId}/documents`}
          className="flex items-center gap-4 bg-amber-600/10 border border-amber-600/20 rounded-xl p-5 hover:bg-amber-600/15 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Generate Docs</div>
            <div className="text-xs text-gray-400">AI documentation with diagrams</div>
          </div>
        </Link>
        <Link
          href={`/dashboard/projects/${projectId}/deployments`}
          className="flex items-center gap-4 bg-emerald-600/10 border border-emerald-600/20 rounded-xl p-5 hover:bg-emerald-600/15 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-white">Deploy</div>
            <div className="text-xs text-gray-400">Push to staging or production</div>
          </div>
        </Link>
      </div>

      {/* Workflows */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Workflows</h2>
          <Link href={`/dashboard/projects/${projectId}/workflows`} className="text-sm text-indigo-400 hover:text-indigo-300">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.workflows.slice(0, 4).map((workflow) => {
            const def = JSON.parse(workflow.definition)
            return (
              <Link
                key={workflow.id}
                href={`/dashboard/projects/${projectId}/workflows/${workflow.id}`}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-indigo-600/30 transition-all group"
              >
                <h3 className="font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">{workflow.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{workflow.description || "No description"}</p>
                <div className="flex items-center gap-2">
                  {def.nodes?.slice(0, 4).map((node: { id: string; type: string; data: { label: string } }, i: number) => (
                    <div key={node.id} className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        node.type === "trigger" ? "bg-gray-700 text-gray-300" :
                        "bg-indigo-900/50 text-indigo-300 border border-indigo-800"
                      }`}>
                        {node.data.label}
                      </span>
                      {i < Math.min(def.nodes.length, 4) - 1 && (
                        <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </Link>
            )
          })}
          {project.workflows.length === 0 && (
            <div className="col-span-2 bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500">
              No workflows yet. Create one from a template.
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Tasks</h2>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {project.tasks.map((task) => {
            const input = task.input ? JSON.parse(task.input) : null
            return (
              <div key={task.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-900/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                    task.type === "REFACTOR" ? "bg-indigo-600/20 text-indigo-400" :
                    task.type === "GENERATE_DOCS" ? "bg-amber-600/20 text-amber-400" :
                    task.type === "DEPLOY" ? "bg-emerald-600/20 text-emerald-400" :
                    "bg-gray-700 text-gray-300"
                  }`}>
                    <Icon name={task.type === "REFACTOR" ? "refactor" : task.type === "GENERATE_DOCS" ? "docs" : task.type === "DEPLOY" ? "deploy" : "bolt"} size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{task.type.replace(/_/g, " ")}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {input?.prompt ? input.prompt.slice(0, 60) + (input.prompt.length > 60 ? "..." : "") : new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {task.tokenUsage > 0 && (
                    <span className="text-xs text-gray-500 font-mono">
                      {(task.tokenUsage / 1000).toFixed(1)}K tokens
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.status === "COMPLETED" ? "bg-emerald-600/20 text-emerald-400" :
                    task.status === "RUNNING" ? "bg-amber-600/20 text-amber-400" :
                    task.status === "FAILED" ? "bg-red-600/20 text-red-400" :
                    "bg-gray-600/20 text-gray-400"
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            )
          })}
          {project.tasks.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">No tasks yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
