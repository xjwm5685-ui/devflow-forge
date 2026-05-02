"use client"

import { trpc } from "@/lib/trpc/client"
import { useParams } from "next/navigation"
import { useState } from "react"
import { safeJsonParse } from "@/lib/utils/safe-json"
import Link from "next/link"

const STATUS_TONE: Record<string, { bg: string; fg: string; ring: string; label: string }> = {
  COMPLETED:  { bg: "rgba(134,239,172,0.16)", fg: "rgb(134 239 172)", ring: "rgba(134,239,172,0.32)", label: "已完成" },
  GENERATING: { bg: "rgba(251,191,36,0.16)",  fg: "rgb(251 191 36)",  ring: "rgba(251,191,36,0.32)",  label: "生成中" },
  FAILED:     { bg: "rgba(248,113,113,0.16)", fg: "rgb(248 113 113)", ring: "rgba(248,113,113,0.32)", label: "失败" },
  DRAFT:      { bg: "rgba(255,255,255,0.05)", fg: "rgb(var(--fg-3))",  ring: "rgba(255,255,255,0.10)", label: "草稿" },
}

export default function DocumentsPage() {
  const params = useParams()
  const projectId = String(params.projectId)
  const { data: documents, refetch } = trpc.document.list.useQuery(
    { projectId },
    {
      refetchInterval: (query) => {
        const items = query.state.data
        if (!items || items.some((d) => d.status === "GENERATING" || d.status === "PENDING")) return 2000
        return false
      },
    }
  )
  const generateDoc = trpc.document.generate.useMutation({ onSuccess: () => refetch() })

  const [showGenerate, setShowGenerate] = useState(false)
  const [title, setTitle] = useState("")
  const [options, setOptions] = useState({ includeDiagrams: true, includeNarration: false, includeVideo: false })

  const optionDefs: Array<{ key: keyof typeof options; label: string; subtitle: string; accent: string }> = [
    { key: "includeDiagrams",  label: "架构图",   subtitle: "Mermaid graph + sequence",         accent: "rgba(165,180,252,0.5)" },
    { key: "includeNarration", label: "语音叙述", subtitle: "TTS narration · MP3",              accent: "rgba(125,211,252,0.5)" },
    { key: "includeVideo",     label: "演示视频", subtitle: "HTML slideshow · auto-built",      accent: "rgba(251,191,36,0.5)" },
  ]

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280, position: "relative" }}>
      <div className="orb" style={{ width: 460, height: 460, top: -120, right: 100, background: "radial-gradient(circle, rgba(251,191,36,0.35), transparent 70%)" }} />

      <Link href={`/dashboard/projects/${projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", marginBottom: 18 }}>
        ← <span>BACK · project</span>
      </Link>

      <div className="reveal flex items-end justify-between mb-8">
        <div>
          <span className="eyebrow">Documents</span>
          <h1 className="headline" style={{ fontSize: 56, marginTop: 8, lineHeight: 1.0 }}>
            Auto-<em>narrated</em> docs
          </h1>
          <p style={{ color: "rgb(var(--fg-3))", fontSize: 13.5, marginTop: 12, maxWidth: 540, lineHeight: 1.6 }}>
            从仓库实时抽取结构、依赖与脚本，组合成 Mermaid 图、TTS 叙述、HTML 演示视频。
          </p>
        </div>
        <button onClick={() => setShowGenerate(!showGenerate)} className="btn btn-aurora flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
          生成文档
        </button>
      </div>

      {showGenerate && (
        <div className="reveal glass glass-edge" style={{ padding: 28, marginBottom: 28 }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className="eyebrow">New document</span>
              <h3 className="headline" style={{ fontSize: 24, marginTop: 4 }}>
                Compose <em style={{ fontFamily: "var(--font-display)" }}>everything</em>
              </h3>
            </div>
            <button onClick={() => setShowGenerate(false)} className="btn btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }}>关闭</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>文档标题</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：API 文档" className="input" />
              <button
                onClick={() => { if (title) { generateDoc.mutate({ projectId, title, options }); setShowGenerate(false); setTitle("") } }}
                disabled={!title || generateDoc.isPending}
                className="btn btn-aurora"
                style={{ marginTop: 16, width: "100%" }}
              >
                {generateDoc.isPending ? "生成中…" : "开始生成"}
              </button>
            </div>

            <div className="space-y-2">
              <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>附加产物</span>
              {optionDefs.map((opt) => {
                const enabled = options[opt.key]
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setOptions({ ...options, [opt.key]: !enabled })}
                    className="glass-soft glass-spot"
                    style={{
                      width: "100%",
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 14px",
                      cursor: "pointer",
                      border: enabled ? `1px solid rgba(165,180,252,0.40)` : "1px solid rgba(255,255,255,0.06)",
                      background: enabled ? `linear-gradient(135deg, ${opt.accent.replace("0.5", "0.12")}, transparent)` : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <span
                      style={{
                        width: 28, height: 28, borderRadius: 9,
                        background: enabled ? `radial-gradient(circle, ${opt.accent}, transparent 70%)` : "rgba(255,255,255,0.04)",
                        border: enabled ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.06)",
                        display: "grid", placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {enabled && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgb(8,6,24)" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1 text-left">
                      <div style={{ fontSize: 13, fontWeight: 500, color: "rgb(var(--fg-1))" }}>{opt.label}</div>
                      <div style={{ fontSize: 10.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 2, letterSpacing: "0.02em" }}>{opt.subtitle}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {documents?.map((doc, idx) => {
          const content = safeJsonParse<{ sections?: Array<{ heading: string; content: string }> }>(doc.content, {})
          const diagrams = safeJsonParse<Array<{ title: string; mermaid: string }>>(doc.diagrams, [])
          const tone = STATUS_TONE[doc.status] ?? STATUS_TONE.DRAFT
          const isInflight = doc.status === "GENERATING" || doc.status === "PENDING"

          return (
            <div key={doc.id} className="reveal glass glass-edge glass-spot" style={{ padding: 0, animationDelay: `${idx * 60}ms`, overflow: "hidden" }}>
              <div style={{ padding: "22px 26px" }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display-italic" style={{ fontSize: 24 }}>{doc.title}</h3>
                    <p style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                      {new Date(doc.createdAt).toLocaleString("zh-CN")} · {doc.id.slice(0, 8)}
                    </p>
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "3px 10px", borderRadius: 999, fontSize: 10.5,
                    fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
                    color: tone.fg, background: tone.bg, border: `1px solid ${tone.ring}`,
                  }}>
                    {isInflight && <span className="dot dot-pulse" style={{ background: tone.fg, color: tone.fg }} />}
                    {tone.label}
                  </span>
                </div>

                {content.sections && content.sections.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 18 }}>
                    {content.sections.slice(0, 4).map((section, i) => (
                      <div key={i} className="glass-soft" style={{ padding: 14 }}>
                        <div className="font-display-italic" style={{ fontSize: 14, color: "rgb(var(--fg-1))", marginBottom: 4 }}>{section.heading}</div>
                        <p className="line-clamp-2" style={{ fontSize: 12, color: "rgb(var(--fg-3))", lineHeight: 1.55 }}>{section.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {diagrams.map((d, i) => (
                    <span key={i} className="chip-aurora" style={{ padding: "3px 10px" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                      {d.title}
                    </span>
                  ))}
                  {doc.audioUrl && (
                    <span className="chip" style={{ background: "rgba(125,211,252,0.10)", borderColor: "rgba(125,211,252,0.25)", color: "rgb(125 211 252)" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18V5l12-2v13M9 13a4 4 0 11-4-4 4 4 0 014 4z" /></svg>
                      Audio
                    </span>
                  )}
                  {doc.videoUrl && (
                    <span className="chip" style={{ background: "rgba(251,191,36,0.10)", borderColor: "rgba(251,191,36,0.25)", color: "rgb(251 191 36)" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" /></svg>
                      Video
                    </span>
                  )}
                </div>

                {(doc.audioUrl || doc.videoUrl) && (
                  <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    {doc.audioUrl && (
                      <audio controls src={doc.audioUrl} style={{ height: 30, flex: 1, maxWidth: 380 }} />
                    )}
                    {doc.videoUrl && (
                      <a href={doc.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-glass" style={{ fontSize: 12, padding: "6px 12px" }}>
                        播放视频 →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {(!documents || documents.length === 0) && (
          <div className="reveal glass-soft" style={{ padding: 56, textAlign: "center", borderStyle: "dashed" }}>
            <div className="font-display-italic" style={{ fontSize: 28, color: "rgb(var(--fg-2))", marginBottom: 6 }}>blank archive.</div>
            <div style={{ fontSize: 13, color: "rgb(var(--fg-4))" }}>点击右上角的<span style={{ color: "rgb(165 180 252)" }}> 生成文档 </span>来组合一份新文档。</div>
          </div>
        )}
      </div>
    </div>
  )
}
