"use client"

import { trpc } from "@/lib/trpc/client"
import Link from "next/link"

export default function ProjectsPage() {
  const { data: projects, isLoading } = trpc.project.list.useQuery()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 mt-1">Manage your connected repositories</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium">
          + New Project
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-800 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-800 rounded w-full mb-2" />
              <div className="h-4 bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 hover:bg-gray-900/80 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                {project.githubRepo && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    {project.githubRepo.split("/")[1]}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                {project.description || "No description"}
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{project._count.workflows} workflows</span>
                <span>{project._count.tasks} tasks</span>
                <span>{project._count.deployments} deploys</span>
              </div>
            </Link>
          ))}

          {/* Add new project card */}
          <button className="bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-6 hover:border-indigo-600 hover:bg-gray-900/50 transition-all flex flex-col items-center justify-center gap-3 min-h-[200px]">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm text-gray-400">Connect Repository</span>
          </button>
        </div>
      )}
    </div>
  )
}
