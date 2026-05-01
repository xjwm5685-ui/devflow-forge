"use client"

import { trpc } from "@/lib/trpc/client"
import Link from "next/link"
import { useState } from "react"

export default function ProjectsPage() {
  const { data: projects, isLoading } = trpc.project.list.useQuery()
  const utils = trpc.useUtils()
  const createProject = trpc.project.create.useMutation({
    onSuccess: () => { utils.project.list.invalidate(); setShowCreate(false) },
  })

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [repo, setRepo] = useState("")

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">项目</h1>
          <p className="text-sm text-zinc-500 mt-1">管理你的代码仓库</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors text-sm font-medium">
          新建项目
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">新建项目</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">项目名称</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Project"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">描述（可选）</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="项目描述"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">GitHub 仓库（可选）</label>
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => {
                if (!name.trim()) return
                createProject.mutate({ name: name.trim(), description: desc || undefined, githubRepo: repo || undefined })
              }} disabled={!name.trim() || createProject.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50">
                {createProject.isPending ? "创建中..." : "创建"}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors text-sm font-medium">取消</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg h-44 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects?.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-sm font-medium">{project.name[0]}</div>
                {project.githubRepo && <span className="text-[11px] text-zinc-600">{project.githubRepo.split("/")[1]}</span>}
              </div>
              <h3 className="text-[13px] font-semibold text-zinc-100 mb-1 group-hover:text-indigo-400 transition-colors">{project.name}</h3>
              <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{project.description || "暂无描述"}</p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                <span>{project._count.workflows} 工作流</span>
                <span>{project._count.tasks} 任务</span>
                <span>{project._count.deployments} 部署</span>
              </div>
            </Link>
          ))}
          <button onClick={() => setShowCreate(true)} className="bg-zinc-900 border border-dashed border-zinc-700 rounded-lg p-5 hover:border-indigo-500/40 transition-colors flex flex-col items-center justify-center gap-2 min-h-[180px] text-zinc-500 hover:text-indigo-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className="text-sm">新建项目</span>
          </button>
        </div>
      )}
    </div>
  )
}
