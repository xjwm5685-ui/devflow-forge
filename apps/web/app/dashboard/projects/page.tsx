"use client"

import { CustomSelect } from "@/components/ui/custom-select"
import { trpc } from "@/lib/trpc/client"
import type { GitHubRepo } from "@devflow/shared"
import Link from "next/link"
import { useMemo, useState } from "react"

type PanelMode = "manual" | "github" | null

function splitRepo(fullName: string): { owner: string; repo: string } | null {
  const [owner, repo] = fullName.split("/")
  if (!owner || !repo) return null
  return { owner, repo }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value))
}

const ACCENTS = [
  "rgba(240,171,252,0.55)", // fuchsia
  "rgba(125,211,252,0.55)", // azure
  "rgba(134,239,172,0.55)", // mint
  "rgba(251,191,36,0.55)",  // amber
  "rgba(165,180,252,0.55)", // periwinkle
  "rgba(251,207,232,0.55)", // rose
]

export default function ProjectsPage() {
  const utils = trpc.useUtils()
  const { data: projects, isLoading } = trpc.project.list.useQuery()

  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [repo, setRepo] = useState("")
  const [repoSearch, setRepoSearch] = useState("")
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [selectedBranch, setSelectedBranch] = useState("")

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      setPanelMode(null)
      setName(""); setDesc(""); setRepo("")
      setSelectedRepo(null); setSelectedBranch("")
    },
  })

  const reposQuery = trpc.github.repos.useQuery(undefined, {
    enabled: panelMode === "github",
    retry: false,
  })

  const repoParts = selectedRepo ? splitRepo(selectedRepo.fullName) : null
  const branchesQuery = trpc.github.branches.useQuery(
    { owner: repoParts?.owner ?? "", repo: repoParts?.repo ?? "" },
    { enabled: panelMode === "github" && !!repoParts, retry: false }
  )

  const filteredRepos = useMemo(() => {
    const repos = reposQuery.data ?? []
    const keyword = repoSearch.trim().toLowerCase()
    if (!keyword) return repos
    return repos.filter((item) =>
      item.fullName.toLowerCase().includes(keyword) ||
      (item.description ?? "").toLowerCase().includes(keyword) ||
      (item.language ?? "").toLowerCase().includes(keyword)
    )
  }, [repoSearch, reposQuery.data])

  const currentBranch = selectedBranch || selectedRepo?.defaultBranch || "main"

  const openPanel = (mode: Exclude<PanelMode, null>) => {
    setPanelMode((current) => current === mode ? null : mode)
  }

  const createManualProject = () => {
    if (!name.trim()) return
    createProject.mutate({
      name: name.trim(),
      description: desc.trim() || undefined,
      githubRepo: repo.trim() || undefined,
    })
  }

  const importSelectedRepo = () => {
    if (!selectedRepo) return
    createProject.mutate({
      name: selectedRepo.name,
      description: selectedRepo.description ?? undefined,
      githubRepo: selectedRepo.fullName,
      githubBranch: currentBranch,
    })
  }

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280, position: "relative" }}>
      <div className="orb" style={{ width: 480, height: 480, top: -120, right: 80, background: "radial-gradient(circle, rgba(125,211,252,0.4), transparent 70%)" }} />
      <div className="orb" style={{ width: 380, height: 380, top: 120, left: -80, background: "radial-gradient(circle, rgba(240,171,252,0.45), transparent 70%)", animationDelay: "-4s" }} />

      {/* Editorial header */}
      <div className="reveal" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 36, position: "relative" }}>
        <div>
          <span className="eyebrow">Projects · 仓库连接</span>
          <h1 className="headline" style={{ fontSize: 64, lineHeight: 1.0, marginTop: 8 }}>
            Connect <em>your</em> code
            <br />
            <span style={{ color: "rgb(var(--fg-3))", fontSize: 28, fontFamily: "var(--font-display)", fontStyle: "italic" }}>
              and <span style={{ color: "rgb(165 180 252)" }}>let agents flow.</span>
            </span>
          </h1>
          <p style={{ fontSize: 13.5, color: "rgb(var(--fg-3))", marginTop: 12, maxWidth: 520, lineHeight: 1.6 }}>
            一次连接 GitHub，工作流就能读取真实文件、生成文档、构建容器。每个项目都是一条独立的流水线。
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button onClick={() => openPanel("github")} className="btn btn-glass">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            导入 GitHub
          </button>
          <button onClick={() => openPanel("manual")} className="btn btn-aurora">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            新建项目
          </button>
        </div>
      </div>

      {/* Manual creation panel */}
      {panelMode === "manual" && (
        <div className="reveal glass glass-edge" style={{ padding: 28, marginBottom: 28 }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="eyebrow">Manual</span>
              <h3 className="headline" style={{ fontSize: 24, marginTop: 4 }}>
                <em style={{ fontFamily: "var(--font-display)" }}>quick</em> create
              </h3>
            </div>
            <button onClick={() => setPanelMode(null)} className="btn btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }}>关闭</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>项目名称</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-project" className="input" />
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>GitHub 仓库（可选）</label>
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" className="input" />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>描述（可选）</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="一句话描述这个项目" className="input" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={createManualProject} disabled={!name.trim() || createProject.isPending} className="btn btn-aurora">
              {createProject.isPending ? "创建中…" : "创建项目"}
            </button>
            <button onClick={() => setPanelMode(null)} className="btn btn-ghost">取消</button>
          </div>
        </div>
      )}

      {/* GitHub import panel */}
      {panelMode === "github" && (
        <div className="reveal glass glass-edge" style={{ padding: 28, marginBottom: 28 }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className="eyebrow">From GitHub</span>
              <h3 className="headline" style={{ fontSize: 24, marginTop: 4 }}>
                Import a <em style={{ fontFamily: "var(--font-display)" }}>repository</em>
              </h3>
              <p style={{ fontSize: 12, color: "rgb(var(--fg-4))", marginTop: 6, maxWidth: 460 }}>
                选择仓库和默认分支。项目创建后，工作流和部署会读取这个仓库的真实文件。
              </p>
            </div>
            <button onClick={() => setPanelMode(null)} className="btn btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }}>关闭</button>
          </div>

          {reposQuery.isError ? (
            <div className="glass-soft" style={{ padding: 24, borderColor: "rgba(251,191,36,0.32)", background: "linear-gradient(180deg, rgba(251,191,36,0.10), rgba(251,191,36,0.04))" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "rgb(var(--warn))", marginBottom: 6 }}>还没有连接 GitHub</div>
              <p style={{ fontSize: 12, color: "rgba(254,243,199,0.75)", marginBottom: 14, lineHeight: 1.6 }}>
                请使用 GitHub 登录，或在环境变量里配置 GITHUB_TOKEN。Demo 模式下会显示演示仓库。
              </p>
              <a href="/api/auth/github" className="btn btn-aurora" style={{ fontSize: 12 }}>连接 GitHub →</a>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 20 }}>
              <div>
                <input value={repoSearch} onChange={(e) => setRepoSearch(e.target.value)} placeholder="搜索仓库、语言或描述" className="input" style={{ marginBottom: 12 }} />
                <div style={{ maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
                  {reposQuery.isLoading && (
                    <div className="space-y-2">
                      {[1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 76 }} />)}
                    </div>
                  )}
                  {!reposQuery.isLoading && filteredRepos.map((item, i) => {
                    const active = selectedRepo?.fullName === item.fullName
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setSelectedRepo(item); setSelectedBranch(item.defaultBranch) }}
                        className="glass-soft glass-spot"
                        style={{
                          width: "100%", textAlign: "left", padding: 14, marginBottom: 8,
                          border: active ? "1px solid rgba(165,180,252,0.45)" : "1px solid rgba(255,255,255,0.06)",
                          background: active
                            ? "linear-gradient(135deg, rgba(165,180,252,0.18), rgba(125,211,252,0.10))"
                            : "rgba(255,255,255,0.03)",
                          transition: "all 0.25s",
                          animationDelay: `${i * 30}ms`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div style={{ fontSize: 13.5, fontWeight: 500, color: "rgb(var(--fg-1))" }}>{item.fullName}</div>
                            <div className="line-clamp-1" style={{ fontSize: 11.5, color: "rgb(var(--fg-4))", marginTop: 3 }}>
                              {item.description ?? "—"}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>{formatDate(item.updatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="chip" style={{ padding: "2px 7px", fontSize: 10 }}>{item.private ? "Private" : "Public"}</span>
                          <span className="chip" style={{ padding: "2px 7px", fontSize: 10 }}>{item.language ?? "—"}</span>
                          <span style={{ fontSize: 10, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>{item.defaultBranch}</span>
                        </div>
                      </button>
                    )
                  })}
                  {!reposQuery.isLoading && filteredRepos.length === 0 && (
                    <div className="glass-soft" style={{ padding: 32, textAlign: "center", borderStyle: "dashed" }}>
                      <div className="font-display-italic" style={{ fontSize: 18, color: "rgb(var(--fg-3))" }}>nothing matched.</div>
                      <div style={{ fontSize: 12, color: "rgb(var(--fg-4))", marginTop: 4 }}>换个关键词试试</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-soft" style={{ padding: 18, height: "fit-content" }}>
                <span className="eyebrow">Import config</span>
                {selectedRepo ? (
                  <div className="space-y-3" style={{ marginTop: 12 }}>
                    <div>
                      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>Repository</div>
                      <div style={{ fontSize: 13, color: "rgb(var(--fg-1))", wordBreak: "break-all" }}>{selectedRepo.fullName}</div>
                    </div>
                    <div>
                      <label className="eyebrow" style={{ display: "block", fontSize: 9.5, marginBottom: 4 }}>Default branch</label>
                      <CustomSelect
                        value={currentBranch}
                        onChange={setSelectedBranch}
                        placeholder="选择分支"
                        disabled={branchesQuery.isLoading}
                        options={
                          branchesQuery.isLoading
                            ? [{ value: currentBranch, label: currentBranch }]
                            : (branchesQuery.data?.length ? branchesQuery.data : [{ name: selectedRepo.defaultBranch, default: true }]).map((branch) => ({
                                value: branch.name,
                                label: branch.name,
                                description: branch.default ? "default" : undefined,
                              }))
                        }
                      />
                    </div>
                    <button onClick={importSelectedRepo} disabled={createProject.isPending} className="btn btn-aurora" style={{ width: "100%", marginTop: 4 }}>
                      {createProject.isPending ? "导入中…" : "导入为项目"}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: "rgb(var(--fg-4))" }}>
                    <div className="font-display-italic" style={{ fontSize: 18, color: "rgb(var(--fg-3))", marginBottom: 4 }}>—</div>
                    从左侧选一个仓库来配置导入。
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 200 }} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
          {projects?.map((project: any, i: number) => {
            const accent = ACCENTS[i % ACCENTS.length]
            const initials = project.name.slice(0, 2).toUpperCase()
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="reveal glass glass-edge glass-spot"
                style={{
                  padding: 0,
                  position: "relative",
                  overflow: "hidden",
                  animationDelay: `${i * 60}ms`,
                  transition: "transform 0.35s var(--ease-spring), border-color 0.35s",
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  e.currentTarget.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`)
                  e.currentTarget.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`)
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)" }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)" }}
              >
                {/* Project halo */}
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 100% at 0% 0%, ${accent}, transparent 60%)`, opacity: 0.45, pointerEvents: "none" }} />

                <div style={{ position: "relative", padding: 24 }}>
                  <div className="flex items-start justify-between mb-5">
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: `radial-gradient(circle, ${accent}, transparent 70%)`,
                        border: "1px solid rgba(255,255,255,0.15)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontSize: 18,
                        color: "rgb(var(--fg-1))",
                      }}
                    >
                      {initials}
                    </span>
                    {project.githubRepo && (
                      <span className="chip" style={{ padding: "3px 8px", fontSize: 10 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                        {project.githubRepo.split("/")[1]}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display-italic" style={{ fontSize: 24, marginBottom: 8, color: "rgb(var(--fg-1))" }}>
                    {project.name}
                  </h3>
                  <p className="line-clamp-2" style={{ fontSize: 12.5, color: "rgb(var(--fg-3))", lineHeight: 1.55, minHeight: 38, marginBottom: 18 }}>
                    {project.description || "（暂无描述）"}
                  </p>

                  <div className="divider" style={{ marginBottom: 14 }} />

                  <div className="flex items-center justify-between" style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgb(var(--fg-4))" }}>
                    <span>{project._count.workflows} flows</span>
                    <span>{project._count.tasks} tasks</span>
                    <span>{project._count.deployments} deploys</span>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Add new card */}
          <button
            onClick={() => openPanel("github")}
            className="reveal glass-soft"
            style={{
              padding: 24,
              minHeight: 220,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              borderStyle: "dashed",
              animationDelay: `${(projects?.length ?? 0) * 60}ms`,
              cursor: "pointer",
              transition: "border-color 0.3s, transform 0.3s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(165,180,252,0.45)"; e.currentTarget.style.transform = "translateY(-2px)" }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)" }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 48, height: 48, borderRadius: 16,
                background: "radial-gradient(circle, rgba(165,180,252,0.4), transparent 70%)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgb(var(--fg-1))",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </span>
            <div className="font-display-italic" style={{ fontSize: 18, color: "rgb(var(--fg-2))" }}>connect a repo</div>
            <div style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>GITHUB · MANUAL</div>
          </button>
        </div>
      )}
    </div>
  )
}
