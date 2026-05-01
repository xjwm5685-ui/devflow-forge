"use client"

import { trpc } from "@/lib/trpc/client"
import Link from "next/link"
import { motion } from "framer-motion"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function StatCard({ label, value, icon, color, delay = 0 }: { label: string; value: string | number; icon: string; color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  )
}

function AgentStatusCard({ name, status }: { name: string; status: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-800 hover:border-gray-700 transition-colors"
    >
      <div className={`w-3 h-3 rounded-full ${status === "idle" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
      <div className="flex-1">
        <div className="text-sm font-medium text-white capitalize">{name}</div>
        <div className="text-xs text-gray-500 capitalize">{status}</div>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { data: stats } = trpc.user.stats.useQuery()
  const { data: tasks } = trpc.task.list.useQuery({ limit: 5 })
  const { data: agents } = trpc.agent.status.useQuery()

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back, demo-user</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Projects" value={stats?.projectCount ?? 0} icon="📁" color="bg-indigo-600/20" delay={0} />
        <StatCard label="Active Tasks" value={stats?.taskCount ?? 0} icon="⚡" color="bg-amber-600/20" delay={0.05} />
        <StatCard label="Tokens Used" value={`${((stats?.totalTokens ?? 0) / 1000).toFixed(1)}K`} icon="🪙" color="bg-emerald-600/20" delay={0.1} />
        <StatCard label="Agents Online" value="4" icon="🤖" color="bg-purple-600/20" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Tasks</h2>
              <Link href="/dashboard/projects" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                View all
              </Link>
            </div>
            <motion.div variants={container} initial="hidden" animate="show" className="divide-y divide-gray-800">
              {tasks?.map((task) => (
                <motion.div key={task.id} variants={item} className="px-6 py-4 flex items-center justify-between hover:bg-gray-900/30 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {task.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {task.project?.name} {task.workflow?.name ? `/ ${task.workflow.name}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono">
                      {task.tokenUsage > 0 ? `${(task.tokenUsage / 1000).toFixed(1)}K tokens` : ""}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === "COMPLETED" ? "bg-emerald-600/20 text-emerald-400" :
                      task.status === "RUNNING" ? "bg-amber-600/20 text-amber-400" :
                      task.status === "FAILED" ? "bg-red-600/20 text-red-400" :
                      "bg-gray-600/20 text-gray-400"
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </motion.div>
              ))}
              {(!tasks || tasks.length === 0) && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No tasks yet. Create a project and run a workflow to get started.
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Agent Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Agent Status</h2>
            </div>
            <div className="p-4 space-y-2">
              {agents?.map((agent) => (
                <AgentStatusCard
                  key={agent.name}
                  name={agent.name}
                  status={agent.status}
                />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 bg-gray-900/50 border border-gray-800 rounded-xl p-6"
          >
            <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/projects"
                className="flex items-center gap-3 p-3 rounded-lg bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 hover:bg-indigo-600/20 transition-colors"
              >
                <span>📁</span>
                <span className="text-sm font-medium">Browse Projects</span>
              </Link>
              <Link
                href="/dashboard/templates"
                className="flex items-center gap-3 p-3 rounded-lg bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20 transition-colors"
              >
                <span>📋</span>
                <span className="text-sm font-medium">Workflow Templates</span>
              </Link>
              <Link
                href="/dashboard/agents"
                className="flex items-center gap-3 p-3 rounded-lg bg-purple-600/10 border border-purple-600/20 text-purple-400 hover:bg-purple-600/20 transition-colors"
              >
                <span>🤖</span>
                <span className="text-sm font-medium">Agent Monitor</span>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
