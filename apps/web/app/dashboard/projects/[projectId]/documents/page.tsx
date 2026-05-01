"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import { useState } from "react"
import { safeJsonParse } from "@/lib/utils/safe-json"
import Link from "next/link"
import { Icon } from "@/components/shared/icon"

export default function DocumentsPage() {
  const params = useParams()
  const projectId = String(params.projectId)
  const { data: documents, refetch } = trpc.document.list.useQuery({ projectId })
  const generateDoc = trpc.document.generate.useMutation({ onSuccess: () => refetch() })

  const [showGenerate, setShowGenerate] = useState(false)
  const [title, setTitle] = useState("")
  const [options, setOptions] = useState({ includeDiagrams: true, includeNarration: false, includeVideo: false })

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/dashboard/projects/${projectId}`} className="text-zinc-500 hover:text-zinc-300 transition-colors"><Icon name="back" size={16} /></Link>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">文档</h1>
          </div>
          <p className="text-sm text-zinc-500">AI 生成的项目文档</p>
        </div>
        <button onClick={() => setShowGenerate(!showGenerate)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors text-sm font-medium">
          生成文档
        </button>
      </div>

      {showGenerate && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">生成新文档</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">文档标题</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：API 文档"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={options.includeDiagrams} onChange={(e) => setOptions({ ...options, includeDiagrams: e.target.checked })} className="rounded border-zinc-700 bg-zinc-800 text-indigo-600" />
                包含架构图
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={options.includeNarration} onChange={(e) => setOptions({ ...options, includeNarration: e.target.checked })} className="rounded border-zinc-700 bg-zinc-800 text-indigo-600" />
                语音叙述
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={options.includeVideo} onChange={(e) => setOptions({ ...options, includeVideo: e.target.checked })} className="rounded border-zinc-700 bg-zinc-800 text-indigo-600" />
                演示视频
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { if (title) { generateDoc.mutate({ projectId, title, options }); setShowGenerate(false); setTitle("") } }}
                disabled={!title || generateDoc.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50">
                {generateDoc.isPending ? "生成中..." : "开始生成"}
              </button>
              <button onClick={() => setShowGenerate(false)} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors text-sm font-medium">取消</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {documents?.map((doc) => {
          const content = safeJsonParse<{ sections?: Array<{ heading: string; content: string }> }>(doc.content, {})
          const diagrams = safeJsonParse<Array<{ title: string; mermaid: string }>>(doc.diagrams, [])

          return (
            <div key={doc.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-zinc-100">{doc.title}</h3>
                  <p className="text-xs text-zinc-600">{new Date(doc.createdAt).toLocaleDateString("zh-CN")}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  doc.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" :
                  doc.status === "GENERATING" ? "bg-yellow-500/10 text-yellow-400" :
                  doc.status === "FAILED" ? "bg-red-500/10 text-red-400" :
                  "bg-zinc-800 text-zinc-500"
                }`}>
                  {doc.status === "COMPLETED" ? "已完成" : doc.status === "GENERATING" ? "生成中" : doc.status === "FAILED" ? "失败" : "草稿"}
                </span>
              </div>

              {content.sections && (
                <div className="space-y-2 mb-4">
                  {content.sections.slice(0, 2).map((section, i) => (
                    <div key={i}>
                      <h4 className="text-xs font-medium text-zinc-300">{section.heading}</h4>
                      <p className="text-xs text-zinc-500 line-clamp-2">{section.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {diagrams.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">生成的图表</h4>
                  <div className="flex gap-2">
                    {diagrams.map((d, i) => (
                      <span key={i} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-[11px] text-indigo-400">{d.title}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio/Video links */}
              {(doc.audioUrl || doc.videoUrl) && (
                <div className="flex gap-3 pt-3 border-t border-zinc-800">
                  {doc.audioUrl && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Icon name="bolt" size={14} />
                      <span>音频叙述已生成</span>
                      <audio controls src={doc.audioUrl} className="h-6" />
                    </div>
                  )}
                  {doc.videoUrl && (
                    <a href={doc.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300">
                      <Icon name="play" size={14} />
                      <span>查看演示视频</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {(!documents || documents.length === 0) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-600 text-sm">
            暂无文档。点击「生成文档」创建第一个。
          </div>
        )}
      </div>
    </div>
  )
}
