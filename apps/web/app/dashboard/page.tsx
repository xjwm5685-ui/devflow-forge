"use client"

import { trpc } from "@/lib/trpc/client"
import Link from "next/link"
import { motion } from "framer-motion"

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-1 border border-surface-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-tertiary uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-semibold text-text-primary tracking-tight">{value}</div>
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
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">概览</h1>
        <p className="text-sm text-text-tertiary mt-1">欢迎回来，demo-user</p>
      </motion.div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="项目" value={stats?.projectCount ?? 0} icon="📁" />
        <StatCard label="任务" value={stats?.taskCount ?? 0} icon="⚡" />
        <StatCard label="Token 用量" value={`${((stats?.totalTokens ?? 0) / 1000).toFixed(1)}K`} icon="🪙" />
        <StatCard label="在线智能体" value="4" icon="🤖" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="col-span-2">
          <div className="bg-surface-1 border border-surface-border rounded-lg">
            <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">最近任务</h2>
              <Link href="/dashboard/projects" className="text-xs text-accent hover:text-accent-light transition-colors">查看全部</Link>
            </div>
            <div className="divide-y divide-surface-border">
              {tasks?.map((task) => (
                <div key={task.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-2/50 transition-colors">
                  <div>
                    <div className="text-[13px] font-medium text-text-primary">{task.type.replace(/_/g, " ")}</div>
                    <div className="text-xs text-text-muted mt-0.5">{task.project?.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.tokenUsage > 0 && <span className="text-xs text-text-muted font-mono">{(task.tokenUsage / 1000).toFixed(1)}K</span>}
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      task.status === "COMPLETED" ? "bg-success/10 text-success" :
                      task.status === "RUNNING" ? "bg-warning/10 text-warning" :
                      task.status === "FAILED" ? "bg-danger/10 text-danger" :
                      "bg-surface-3 text-text-muted"
                    }`}>
                      {task.status === "COMPLETED" ? "完成" : task.status === "RUNNING" ? "运行中" : task.status === "FAILED" ? "失败" : task.status === "PENDING" ? "等待中" : task.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!tasks || tasks.length === 0) && <div className="px-5 py-10 text-center text-sm text-text-muted">暂无任务</div>}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="bg-surface-1 border border-surface-border rounded-lg">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h2 className="text-sm font-semibold text-text-primary">智能体状态</h2>
            </div>
            <div className="p-3 space-y-1">
              {agents?.map((agent) => (
                <div key={agent.name} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-2/50 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full ${agent.status === "idle" ? "bg-success" : "bg-warning animate-pulse-dot"}`} />
                  <span className="text-[13px] text-text-primary capitalize flex-1">{agent.name}</span>
                  <span className="text-[11px] text-text-muted">{agent.tasksCompleted}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-1 border border-surface-border rounded-lg p-4 space-y-1.5">
            <h2 className="text-sm font-semibold text-text-primary mb-2">快速操作</h2>
            {[
              { href: "/dashboard/projects", label: "浏览项目", icon: "📁" },
              { href: "/dashboard/templates", label: "工作流模板", icon: "📋" },
              { href: "/dashboard/agents", label: "智能体监控", icon: "🤖" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors">
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
