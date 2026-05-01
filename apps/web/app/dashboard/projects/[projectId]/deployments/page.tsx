"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"

export default function DeploymentsPage() {
  const params = useParams()
  const projectId = String(params.projectId)
  const { data: deployments, refetch } = trpc.deployment.list.useQuery({ projectId })
  const createDeploy = trpc.deployment.create.useMutation({ onSuccess: () => refetch() })

  const stages = ["PENDING", "BUILDING", "PUSHING", "DEPLOYING", "RUNNING"]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Deployments</h1>
          <p className="text-gray-400 mt-1">Deploy your application to staging or production</p>
        </div>
        <button
          onClick={() => createDeploy.mutate({ projectId, environment: "staging", provider: "docker-local" })}
          disabled={createDeploy.isPending}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {createDeploy.isPending ? "Deploying..." : "Deploy to Staging"}
        </button>
      </div>

      <div className="space-y-4">
        {deployments?.map((deploy) => {
          const currentStageIndex = stages.indexOf(deploy.status)
          const logs = deploy.logs ? JSON.parse(deploy.logs) : []

          return (
            <div key={deploy.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{deploy.environment}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      deploy.status === "RUNNING" ? "bg-emerald-600/20 text-emerald-400" :
                      deploy.status === "FAILED" ? "bg-red-600/20 text-red-400" :
                      "bg-amber-600/20 text-amber-400"
                    }`}>
                      {deploy.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(deploy.createdAt).toLocaleString()}
                  </p>
                </div>
                {deploy.url && (
                  <a
                    href={deploy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-400 hover:underline"
                  >
                    {deploy.url}
                  </a>
                )}
              </div>

              {/* Pipeline visualization */}
              <div className="flex items-center gap-2 mb-4">
                {stages.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded text-xs font-medium ${
                      i <= currentStageIndex
                        ? i === currentStageIndex && deploy.status !== "RUNNING"
                          ? "bg-amber-600/20 text-amber-400 animate-pulse"
                          : "bg-emerald-600/20 text-emerald-400"
                        : "bg-gray-800 text-gray-500"
                    }`}>
                      {stage}
                    </div>
                    {i < stages.length - 1 && (
                      <div className={`w-6 h-0.5 ${
                        i < currentStageIndex ? "bg-emerald-600" : "bg-gray-700"
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Logs */}
              {logs.length > 0 && (
                <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs">
                  {logs.map((log: string, i: number) => (
                    <div key={i} className="text-gray-400 py-0.5">{log}</div>
                  ))}
                </div>
              )}

              {/* Docker image */}
              {deploy.dockerImage && (
                <div className="mt-3 text-xs text-gray-500">
                  Image: {deploy.dockerImage}
                </div>
              )}
            </div>
          )
        })}

        {(!deployments || deployments.length === 0) && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            No deployments yet. Click &quot;Deploy to Staging&quot; to start.
          </div>
        )}
      </div>
    </div>
  )
}
