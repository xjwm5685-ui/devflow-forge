"use client"

import { trpc } from "@/lib/trpc/client"
import Link from "next/link"

export default function ProjectsPage() {
  const { data: projects, isLoading } = trpc.project.list.useQuery()

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">项目</h1>
          <p className="text-sm text-text-tertiary mt-1">管理你的代码仓库</p>
        </div>
        <button className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-light transition-colors text-sm font-medium">
          新建项目
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-surface-1 border border-surface-border rounded-lg h-44 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects?.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="bg-surface-1 border border-surface-border rounded-lg p-5 hover:border-surface-border-light transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-md bg-accent-dim flex items-center justify-center text-accent-light text-sm font-medium">
                  {project.name[0]}
                </div>
                {project.githubRepo && <span className="text-[11px] text-text-muted">{project.githubRepo.split("/")[1]}</span>}
              </div>
              <h3 className="text-[13px] font-semibold text-text-primary mb-1 group-hover:text-accent-light transition-colors">{project.name}</h3>
              <p className="text-xs text-text-muted mb-4 line-clamp-2">{project.description || "暂无描述"}</p>
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
                <span>{project._count.workflows} 工作流</span>
                <span>{project._count.tasks} 任务</span>
                <span>{project._count.deployments} 部署</span>
              </div>
            </Link>
          ))}
          <button className="bg-surface-1 border border-dashed border-surface-border rounded-lg p-5 hover:border-accent/40 transition-colors flex flex-col items-center justify-center gap-2 min-h-[180px] text-text-muted hover:text-accent-light">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">连接仓库</span>
          </button>
        </div>
      )}
    </div>
  )
}
