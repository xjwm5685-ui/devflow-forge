"use client"

import { trpc } from "@/lib/trpc/client"
import { AGENT_CONFIG } from "@devflow/shared"
import { Icon } from "@/components/shared/icon"

export default function AgentsPage() {
  const { data: agents } = trpc.agent.status.useQuery()
  const { data: tokenData } = trpc.agent.tokenUsage.useQuery()

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">智能体监控</h1>
        <p className="text-sm text-zinc-500 mt-1">实时查看 AI 开发团队状态</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {agents?.map((agent) => {
          const config = AGENT_CONFIG[agent.name as keyof typeof AGENT_CONFIG]
          return (
            <div key={agent.name} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config?.color ?? "#6b7280"}15`, color: config?.color ?? "#6b7280" }}>
                    <Icon name={config?.icon ?? "bot"} size={20} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-zinc-100">{config?.label ?? agent.name}</h3>
                    <p className="text-xs text-zinc-500">{config?.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${agent.status === "idle" ? "bg-emerald-500" : "bg-yellow-500 animate-pulse-dot"}`} />
                  <span className="text-[11px] text-zinc-500">{agent.status === "idle" ? "空闲" : "运行中"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 rounded-md p-3">
                  <div className="text-lg font-semibold text-zinc-100">{agent.tasksCompleted}</div>
                  <div className="text-[11px] text-zinc-500">已完成任务</div>
                </div>
                <div className="bg-zinc-800/50 rounded-md p-3">
                  <div className="text-lg font-semibold text-zinc-100">{agent.lastActive ? new Date(agent.lastActive).toLocaleTimeString("zh-CN") : "无"}</div>
                  <div className="text-[11px] text-zinc-500">最后活跃</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">Token 用量（近 30 天）</h2>
        {tokenData?.byDay && Object.keys(tokenData.byDay).length > 0 ? (() => {
          const entries = Object.entries(tokenData.byDay)
          const maxTokens = Math.max(...Object.values(tokenData.byDay))
          return (
            <div className="h-44 flex items-end gap-1">
              {entries.map(([day, tokens]) => {
                const height = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-indigo-500/60 rounded-t" style={{ height: `${height}%` }} />
                    <span className="text-[10px] text-zinc-600 -rotate-45 origin-top-left">{day.split("-")[2]}</span>
                  </div>
                )
              })}
            </div>
          )
        })() : (
          <div className="h-44 flex items-center justify-center text-sm text-zinc-600">暂无数据，运行工作流后将显示用量</div>
        )}
      </div>
    </div>
  )
}
