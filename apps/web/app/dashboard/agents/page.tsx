"use client"

import { trpc } from "@/lib/trpc/client"
import { AGENT_CONFIG } from "@devflow/shared"

export default function AgentsPage() {
  const { data: agents } = trpc.agent.status.useQuery()
  const { data: tokenData } = trpc.agent.tokenUsage.useQuery()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Agent Monitor</h1>
        <p className="text-gray-400 mt-1">Real-time status of your AI development team</p>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {agents?.map((agent) => {
          const config = AGENT_CONFIG[agent.name as keyof typeof AGENT_CONFIG]
          return (
            <div key={agent.name} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${config?.color ?? "#6b7280"}20` }}
                  >
                    {config?.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{config?.label ?? agent.name}</h3>
                    <p className="text-xs text-gray-500">{config?.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    agent.status === "idle" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                  }`} />
                  <span className="text-xs text-gray-400 capitalize">{agent.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/30 rounded-lg p-3">
                  <div className="text-lg font-bold text-white">{agent.tasksCompleted}</div>
                  <div className="text-xs text-gray-500">Tasks Completed</div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3">
                  <div className="text-lg font-bold text-white">
                    {agent.lastActive ? new Date(agent.lastActive).toLocaleTimeString() : "Never"}
                  </div>
                  <div className="text-xs text-gray-500">Last Active</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Token Usage Chart */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Token Usage (Last 30 Days)</h2>
        {tokenData?.byDay && Object.keys(tokenData.byDay).length > 0 ? (() => {
          const entries = Object.entries(tokenData.byDay)
          const maxTokens = Math.max(...Object.values(tokenData.byDay))
          return (
            <div className="h-48 flex items-end gap-1">
              {entries.map(([day, tokens]) => {
                const height = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-indigo-600 rounded-t" style={{ height: `${height}%` }} />
                    <span className="text-[10px] text-gray-600 -rotate-45 origin-top-left">{day.split("-")[2]}</span>
                  </div>
                )
              })}
            </div>
          )
        })() : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            No token usage data yet. Run a workflow to see usage.
          </div>
        )}
      </div>
    </div>
  )
}
