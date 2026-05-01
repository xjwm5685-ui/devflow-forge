"use client"

import { trpc } from "@/lib/trpc/client"
import Link from "next/link"
import { motion } from "framer-motion"
import { Icon } from "@/components/shared/icon"

function StatCard({ label, value, iconName }: { label: string; value: string | number; iconName: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className="text-zinc-600"><Icon name={iconName} size={18} /></span>
      </div>
      <div className="text-2xl font-semibold text-zinc-100 tracking-tight">{value}</div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { data: stats } = trpc.user.stats.useQuery()
  const { data: tasks } = trpc.task.list.useQuery({ limit: 5 })
  const { data: agents } = trpc.agent.status.useQuery()

  return (
    <div className="p-8 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">概览</h1>
        <p className="text-sm text-zinc-500 mt-1">欢迎回来，demo-user</p>
      </motion.div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="项目" value={stats?.projectCount ?? 0} iconName="folder" />
        <StatCard label="任务" value={stats?.taskCount ?? 0} iconName="bolt" />
        <StatCard label="Token 用量" value={`${((stats?.totalTokens ?? 0) / 1000).toFixed(1)}K`} iconName="coin" />
        <StatCard label="在线智能体" value="4" iconName="bot" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">最近任务</h2>
              <Link href="/dashboard/projects" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">查看全部</Link>
            </div>
            <div className="divide-y divide-zinc-800">
              {tasks?.map((task) => (
                <div key={task.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                  <div>
                    <div className="text-[13px] font-medium text-zinc-100">{task.type.replace(/_/g, " ")}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">{task.project?.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.tokenUsage > 0 && <span className="text-xs text-zinc-600 font-mono">{(task.tokenUsage / 1000).toFixed(1)}K</span>}
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      task.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" :
                      task.status === "RUNNING" ? "bg-yellow-500/10 text-yellow-400" :
                      task.status === "FAILED" ? "bg-red-500/10 text-red-400" :
                      "bg-zinc-800 text-zinc-500"
                    }`}>
                      {task.status === "COMPLETED" ? "完成" : task.status === "RUNNING" ? "运行中" : task.status === "FAILED" ? "失败" : task.status === "PENDING" ? "等待中" : task.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!tasks || tasks.length === 0) && <div className="px-5 py-10 text-center text-sm text-zinc-600">暂无任务</div>}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="px-5 py-3.5 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">智能体状态</h2>
            </div>
            <div className="p-3 space-y-1">
              {agents?.map((agent) => (
                <div key={agent.name} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-zinc-800/30 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full ${agent.status === "idle" ? "bg-emerald-500" : "bg-yellow-500 animate-pulse-dot"}`} />
                  <span className="text-[13px] text-zinc-100 capitalize flex-1">{agent.name}</span>
                  <span className="text-[11px] text-zinc-600">{agent.tasksCompleted}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-1.5">
            <h2 className="text-sm font-semibold text-zinc-100 mb-2">快速操作</h2>
            {[
              { href: "/dashboard/projects", label: "浏览项目", iconName: "folder" },
              { href: "/dashboard/templates", label: "工作流模板", iconName: "template" },
              { href: "/dashboard/agents", label: "智能体监控", iconName: "bot" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
                <span className="text-zinc-500"><Icon name={item.iconName} size={16} /></span>
                {item.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
