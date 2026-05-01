"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import { useState } from "react"

export default function DocumentsPage() {
  const params = useParams()
  const projectId = String(params.projectId)
  const { data: documents, refetch } = trpc.document.list.useQuery({ projectId })
  const generateDoc = trpc.document.generate.useMutation({ onSuccess: () => refetch() })

  const [showGenerate, setShowGenerate] = useState(false)
  const [title, setTitle] = useState("")
  const [options, setOptions] = useState({
    includeDiagrams: true,
    includeNarration: false,
    includeVideo: false,
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-gray-400 mt-1">AI-generated documentation with multi-modal content</p>
        </div>
        <button
          onClick={() => setShowGenerate(!showGenerate)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium"
        >
          + Generate Document
        </button>
      </div>

      {/* Generate Form */}
      {showGenerate && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">Generate New Document</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., API Documentation"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={options.includeDiagrams}
                  onChange={(e) => setOptions({ ...options, includeDiagrams: e.target.checked })}
                  className="rounded border-gray-700 bg-gray-800 text-indigo-600"
                />
                Include Diagrams
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={options.includeNarration}
                  onChange={(e) => setOptions({ ...options, includeNarration: e.target.checked })}
                  className="rounded border-gray-700 bg-gray-800 text-indigo-600"
                />
                Audio Narration
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={options.includeVideo}
                  onChange={(e) => setOptions({ ...options, includeVideo: e.target.checked })}
                  className="rounded border-gray-700 bg-gray-800 text-indigo-600"
                />
                Demo Video
              </label>
            </div>
            <button
              onClick={() => {
                if (title) {
                  generateDoc.mutate({ projectId, title, options })
                  setShowGenerate(false)
                  setTitle("")
                }
              }}
              disabled={!title || generateDoc.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {generateDoc.isPending ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-4">
        {documents?.map((doc) => {
          const content = doc.content ? JSON.parse(doc.content) : null
          return (
            <div key={doc.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{doc.title}</h3>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  doc.status === "COMPLETED" ? "bg-emerald-600/20 text-emerald-400" :
                  doc.status === "GENERATING" ? "bg-amber-600/20 text-amber-400" :
                  doc.status === "FAILED" ? "bg-red-600/20 text-red-400" :
                  "bg-gray-600/20 text-gray-400"
                }`}>
                  {doc.status}
                </span>
              </div>

              {content?.sections && (
                <div className="space-y-3 mt-4">
                  {content.sections.slice(0, 2).map((section: { heading: string; content: string }, i: number) => (
                    <div key={i}>
                      <h4 className="text-sm font-medium text-gray-300">{section.heading}</h4>
                      <p className="text-sm text-gray-500 line-clamp-3">{section.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Diagrams */}
              {doc.diagrams && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Generated Diagrams</h4>
                  <div className="flex gap-2">
                    {JSON.parse(doc.diagrams).map((d: { title: string }, i: number) => (
                      <span key={i} className="px-2 py-1 bg-indigo-900/30 border border-indigo-800 rounded text-xs text-indigo-300">
                        {d.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {(!documents || documents.length === 0) && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            No documents yet. Click &quot;Generate Document&quot; to create one.
          </div>
        )}
      </div>
    </div>
  )
}
