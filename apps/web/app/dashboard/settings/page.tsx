"use client"

import { FolderOpen, Loader2, RefreshCw, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type AIRuntime = "api" | "cli"
type CliMode = "read-only" | "workspace-write"
type CliFallbackBehavior = "fail" | "api" | "demo"
type SettingsMode = "demo" | AIRuntime

interface CliProvider {
  id: string
  name: string
  description: string
  docsUrl: string
  enforcesReadOnly?: boolean
  enforcesWriteMode?: boolean
}

interface Settings {
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
  demoMode: boolean
  hasApiKey: boolean
  aiRuntime: AIRuntime
  cliProvider: string
  cliModel: string
  cliMode: CliMode
  cliWorkingDirectory: string
  cliTimeoutSeconds: number
  customCliCommand: string
  customCliArgs: string
  cliFallbackBehavior: CliFallbackBehavior
  cliProviders: CliProvider[]
}

const DEFAULT_SETTINGS: Settings = {
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o",
  demoMode: true,
  hasApiKey: false,
  aiRuntime: "api",
  cliProvider: "claude-code",
  cliModel: "",
  cliMode: "read-only",
  cliWorkingDirectory: "",
  cliTimeoutSeconds: 300,
  customCliCommand: "",
  customCliArgs: "",
  cliFallbackBehavior: "fail",
  cliProviders: [],
}

const PROVIDERS = [
  { name: "OpenAI",     baseUrl: "https://api.openai.com/v1",                            models: ["gpt-4o", "gpt-4o-mini"] },
  { name: "DeepSeek",   baseUrl: "https://api.deepseek.com/v1",                          models: ["deepseek-chat", "deepseek-coder"] },
  { name: "Moonshot",   baseUrl: "https://api.moonshot.cn/v1",                           models: ["moonshot-v1-8k", "moonshot-v1-32k"] },
  { name: "智谱 GLM",    baseUrl: "https://open.bigmodel.cn/api/paas/v4",                 models: ["glm-4", "glm-4-flash"] },
  { name: "通义千问",    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",   models: ["qwen-max", "qwen-plus"] },
  { name: "本地 Ollama", baseUrl: "http://localhost:11434/v1",                            models: ["llama3", "qwen2.5"] },
  { name: "自定义",      baseUrl: "",                                                     models: [] },
] as const

const MODE_OPTIONS: Array<{ value: SettingsMode; label: string; subtitle: string; accent: string }> = [
  { value: "demo", label: "演示模式",  subtitle: "Pre-recorded · zero cost",   accent: "rgba(255,255,255,0.18)" },
  { value: "api",  label: "API 调用",  subtitle: "OpenAI-compatible endpoint", accent: "rgba(165,180,252,0.55)" },
  { value: "cli",  label: "本机 CLI",  subtitle: "Claude Code · opencode · …", accent: "rgba(134,239,172,0.55)" },
]

function PillToggle<T extends string>({ value, options, onChange }: {
  value: T
  options: Array<{ value: T; label: string; subtitle?: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="glass-soft" style={{ display: "inline-flex", padding: 4, borderRadius: 14, gap: 2 }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 500,
              color: active ? "rgb(8 6 24)" : "rgb(var(--fg-3))",
              background: active ? "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(220,220,255,0.85))" : "transparent",
              boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 12px -6px rgba(240,171,252,0.4)" : "none",
              transition: "all 0.25s",
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [selectedProvider, setSelectedProvider] = useState("OpenAI")
  const [cliModels, setCliModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectingFolder, setSelectingFolder] = useState(false)
  const [folderPickerError, setFolderPickerError] = useState<string | null>(null)

  const mode: SettingsMode = settings.demoMode ? "demo" : settings.aiRuntime
  const selectedApiProvider = useMemo(
    () => PROVIDERS.find((provider) => provider.name === selectedProvider),
    [selectedProvider]
  )

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      const next = { ...DEFAULT_SETTINGS, ...data }
      setSettings(next)
      const provider = PROVIDERS.find((p) => p.baseUrl === next.openaiBaseUrl)
      if (provider) setSelectedProvider(provider.name)
      if (next.aiRuntime === "cli" && next.cliProvider && next.cliProvider !== "custom") {
        loadCliModels(next.cliProvider)
      }
    }).catch(console.error)
  }, [])

  function setMode(nextMode: SettingsMode) {
    setTestResult(null)
    setSettings((current) => ({
      ...current,
      demoMode: nextMode === "demo",
      aiRuntime: nextMode === "cli" ? "cli" : "api",
    }))
  }

  async function loadCliModels(providerId: string) {
    if (!providerId || providerId === "custom") {
      setCliModels([])
      return
    }
    setLoadingModels(true)
    try {
      const res = await fetch(`/api/settings/cli-models?provider=${encodeURIComponent(providerId)}`)
      const data = await res.json().catch(() => ({ models: [] }))
      setCliModels(data.models ?? [])
    } catch {
      setCliModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await (await fetch("/api/settings/test")).json())
    } catch {
      setTestResult({ ok: false, message: "连接失败" })
    } finally {
      setTesting(false)
    }
  }

  async function handleChooseWorkingDirectory() {
    setSelectingFolder(true)
    setFolderPickerError(null)
    setTestResult(null)
    try {
      const response = await fetch("/api/settings/folder-picker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialDirectory: settings.cliWorkingDirectory }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? "无法打开文件夹选择器")
      }

      if (data?.path) {
        setSettings((current) => ({ ...current, cliWorkingDirectory: data.path }))
      }
    } catch (error) {
      setFolderPickerError(error instanceof Error ? error.message : "选择文件夹失败")
    } finally {
      setSelectingFolder(false)
    }
  }

  function handleClearWorkingDirectory() {
    setFolderPickerError(null)
    setTestResult(null)
    setSettings((current) => ({ ...current, cliWorkingDirectory: "" }))
  }

  return (
    <div style={{ padding: "40px 48px 64px", maxWidth: 1280, position: "relative" }}>
      <div className="orb" style={{ width: 420, height: 420, top: -100, right: 80, background: "radial-gradient(circle, rgba(240,171,252,0.40), transparent 70%)" }} />

      <div className="reveal mb-10">
        <span className="eyebrow">Settings · 配置</span>
        <h1 className="headline" style={{ fontSize: 56, marginTop: 8, lineHeight: 1.0 }}>
          Tune the <em>runtime</em>
        </h1>
        <p style={{ color: "rgb(var(--fg-3))", fontSize: 13.5, marginTop: 12, maxWidth: 540, lineHeight: 1.6 }}>
          选择 AI 来源、控制本机执行权限、调整模型。所有改动即时生效，不必重启。
        </p>
      </div>

      {/* Mode picker — large bento cards */}
      <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {MODE_OPTIONS.map((option, i) => {
          const active = mode === option.value
          return (
            <button
              key={option.value}
              onClick={() => setMode(option.value)}
              className="glass glass-edge glass-spot"
              style={{
                padding: 22,
                position: "relative",
                overflow: "hidden",
                textAlign: "left",
                cursor: "pointer",
                animationDelay: `${i * 60}ms`,
                border: active ? "1px solid rgba(165,180,252,0.45)" : "1px solid rgba(255,255,255,0.08)",
                background: active
                  ? "linear-gradient(135deg, rgba(165,180,252,0.16), rgba(125,211,252,0.06))"
                  : undefined,
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 100% at 100% 0%, ${option.accent}, transparent 60%)`, opacity: active ? 0.6 : 0.35, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div className="flex items-center justify-between mb-4">
                  <span style={{ fontSize: 11, color: active ? "rgb(165 180 252)" : "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
                    0{i + 1}
                  </span>
                  {active && <span className="dot dot-pulse" style={{ background: "rgb(165 180 252)", color: "rgb(165 180 252)" }} />}
                </div>
                <div className="font-display-italic" style={{ fontSize: 24, color: "rgb(var(--fg-1))" }}>{option.label}</div>
                <div style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 6, letterSpacing: "0.02em" }}>
                  {option.subtitle}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {mode === "api" && (
        <div className="reveal glass glass-edge" style={{ padding: 28, marginBottom: 20 }}>
          <div className="flex items-end justify-between mb-5">
            <div>
              <span className="eyebrow">API runtime</span>
              <h2 className="headline" style={{ fontSize: 26, marginTop: 4 }}>
                OpenAI-<em style={{ fontFamily: "var(--font-display)" }}>compatible</em>
              </h2>
            </div>
            <PillToggle
              value={selectedProvider}
              options={PROVIDERS.map((p) => ({ value: p.name, label: p.name }))}
              onChange={(v) => {
                setSelectedProvider(v)
                const provider = PROVIDERS.find((p) => p.name === v)
                if (provider?.baseUrl) setSettings((s) => ({ ...s, openaiBaseUrl: provider.baseUrl }))
                if (provider && provider.models.length > 0) setSettings((s) => ({ ...s, openaiModel: provider.models[0]! }))
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>API 密钥</label>
              <input
                type="password"
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                placeholder={settings.hasApiKey ? "已配置（输入新密钥以更换）" : "sk-..."}
                className="input"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>Base URL</label>
              <input
                value={settings.openaiBaseUrl}
                onChange={(e) => setSettings({ ...settings, openaiBaseUrl: e.target.value })}
                className="input"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>模型 ID</label>
              <input
                value={settings.openaiModel}
                onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
                className="input"
                style={{ fontFamily: "var(--font-mono)" }}
              />
              {selectedApiProvider?.models.length ? (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {selectedApiProvider.models.map((model) => (
                    <button
                      key={model}
                      onClick={() => setSettings({ ...settings, openaiModel: model })}
                      className="chip"
                      style={{
                        cursor: "pointer",
                        background: settings.openaiModel === model ? "rgba(165,180,252,0.20)" : "rgba(255,255,255,0.05)",
                        color: settings.openaiModel === model ? "rgb(165 180 252)" : "rgb(var(--fg-3))",
                        borderColor: settings.openaiModel === model ? "rgba(165,180,252,0.40)" : "rgba(255,255,255,0.08)",
                      }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {mode === "cli" && (
        <>
          <div className="reveal glass glass-edge" style={{ padding: 28, marginBottom: 14 }}>
            <div className="flex items-end justify-between mb-5">
              <div>
                <span className="eyebrow">CLI runtime</span>
                <h2 className="headline" style={{ fontSize: 26, marginTop: 4 }}>
                  Spawn a <em style={{ fontFamily: "var(--font-display)" }}>local agent</em>
                </h2>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {settings.cliProviders.map((provider) => {
                const active = settings.cliProvider === provider.id
                const writeOk = provider.enforcesWriteMode
                const readOk = provider.enforcesReadOnly
                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setSettings({ ...settings, cliProvider: provider.id })
                      loadCliModels(provider.id)
                    }}
                    className="glass-soft glass-spot"
                    style={{
                      padding: 16,
                      textAlign: "left",
                      cursor: "pointer",
                      border: active ? "1px solid rgba(134,239,172,0.40)" : "1px solid rgba(255,255,255,0.06)",
                      background: active ? "linear-gradient(135deg, rgba(134,239,172,0.14), transparent)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="font-display-italic" style={{ fontSize: 17, color: "rgb(var(--fg-1))" }}>{provider.name}</div>
                    <div className="line-clamp-2" style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                      {provider.description}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <span style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 999,
                        fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
                        color: readOk ? "rgb(134 239 172)" : "rgba(254,243,199,0.7)",
                        background: readOk ? "rgba(134,239,172,0.10)" : "rgba(251,191,36,0.10)",
                        border: readOk ? "1px solid rgba(134,239,172,0.25)" : "1px solid rgba(251,191,36,0.25)",
                      }}>
                        RO {readOk ? "强制" : "软约束"}
                      </span>
                      <span style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 999,
                        fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
                        color: writeOk ? "rgb(165 180 252)" : "rgba(254,243,199,0.7)",
                        background: writeOk ? "rgba(165,180,252,0.10)" : "rgba(251,191,36,0.10)",
                        border: writeOk ? "1px solid rgba(165,180,252,0.30)" : "1px solid rgba(251,191,36,0.25)",
                      }}>
                        RW {writeOk ? "强制" : "软约束"}
                      </span>
                    </div>
                  </button>
                )
              })}
              <button
                onClick={() => {
                  setSettings({ ...settings, cliProvider: "custom" })
                  setCliModels([])
                }}
                className="glass-soft glass-spot"
                style={{
                  padding: 16,
                  textAlign: "left",
                  cursor: "pointer",
                  border: settings.cliProvider === "custom" ? "1px solid rgba(165,180,252,0.40)" : "1px solid rgba(255,255,255,0.06)",
                  background: settings.cliProvider === "custom" ? "linear-gradient(135deg, rgba(165,180,252,0.14), transparent)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div className="font-display-italic" style={{ fontSize: 17 }}>自定义</div>
                <div style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 4 }}>任意本机 CLI 命令</div>
              </button>
            </div>
          </div>

          <div className="reveal glass glass-edge" style={{ padding: 28, marginBottom: 14 }}>
            <div className="flex items-end justify-between mb-5">
              <div>
                <span className="eyebrow">Permissions</span>
                <h2 className="headline" style={{ fontSize: 22, marginTop: 4 }}>
                  执行 <em style={{ fontFamily: "var(--font-display)" }}>策略</em>
                </h2>
              </div>
              <PillToggle
                value={settings.cliMode}
                options={[
                  { value: "read-only", label: "只读分析" },
                  { value: "workspace-write", label: "允许改工作区" },
                ]}
                onChange={(v) => setSettings({ ...settings, cliMode: v })}
              />
            </div>

            {/* Workspace materialization explainer */}
            <div className="glass-soft" style={{
              padding: "12px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.55,
              borderColor: settings.cliMode === "workspace-write" && !settings.cliWorkingDirectory.trim()
                ? "rgba(251,191,36,0.32)"
                : "rgba(125,211,252,0.25)",
              background: settings.cliMode === "workspace-write" && !settings.cliWorkingDirectory.trim()
                ? "linear-gradient(135deg, rgba(251,191,36,0.10), transparent)"
                : "linear-gradient(135deg, rgba(125,211,252,0.06), transparent)",
              color: "rgb(var(--fg-2))",
            }}>
              {settings.cliWorkingDirectory.trim() ? (
                <>
                  <span className="eyebrow" style={{ marginRight: 8 }}>WORKDIR</span>
                  CLI 会在这个绝对路径下运行。请确认它<strong style={{ color: "rgb(var(--fg-1))" }}>不在 DevFlow Forge 应用目录内</strong>，否则 workspace-write 会改到 DevFlow 自己。
                </>
              ) : settings.cliMode === "workspace-write" ? (
                <>
                  <span className="eyebrow" style={{ marginRight: 8, color: "rgb(var(--warn))" }}>HEADS UP</span>
                  workspace-write 模式下，如果不指定工作目录，DevFlow 会为<strong style={{ color: "rgb(var(--fg-1))" }}>每个任务</strong>把 GitHub 仓库快照物化到 <code style={{ fontFamily: "var(--font-mono)" }}>storage/cli-workspaces/&lt;taskId&gt;/</code> 并清理。CLI 在那里读写都不会污染 DevFlow 应用目录。
                </>
              ) : (
                <>
                  <span className="eyebrow" style={{ marginRight: 8 }}>READ-ONLY</span>
                  CLI 会在自动物化的快照目录中运行；read-only 模式只读不写。
                </>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>模型</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={settings.cliModel}
                    onChange={(e) => setSettings({ ...settings, cliModel: e.target.value })}
                    placeholder={cliModels.length > 0 ? "从下方选择或输入模型名称" : "输入模型名称（如 sonnet、gpt-4o）"}
                    className="input"
                    style={{ fontFamily: "var(--font-mono)", minWidth: 0, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => loadCliModels(settings.cliProvider)}
                    disabled={loadingModels || !settings.cliProvider || settings.cliProvider === "custom"}
                    className="btn btn-glass"
                    style={{ padding: "10px 12px", whiteSpace: "nowrap" }}
                  >
                    {loadingModels ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                    {loadingModels ? "获取中" : "获取模型"}
                  </button>
                </div>
                {cliModels.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {cliModels.map((model) => (
                      <button
                        key={model}
                        onClick={() => setSettings({ ...settings, cliModel: model })}
                        className="chip"
                        style={{
                          cursor: "pointer",
                          background: settings.cliModel === model ? "rgba(134,239,172,0.20)" : "rgba(255,255,255,0.05)",
                          color: settings.cliModel === model ? "rgb(134 239 172)" : "rgb(var(--fg-3))",
                          borderColor: settings.cliModel === model ? "rgba(134,239,172,0.40)" : "rgba(255,255,255,0.08)",
                        }}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                  {settings.cliModel ? `已选择: ${settings.cliModel}` : "留空则使用 CLI 默认模型"}
                  {cliModels.length > 0 && ` · 可用 ${cliModels.length} 个模型`}
                </div>
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>工作目录</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={settings.cliWorkingDirectory}
                    readOnly
                    title={settings.cliWorkingDirectory || "留空 = 自动物化每任务快照"}
                    placeholder="留空 = 自动物化每任务快照"
                    className="input"
                    style={{ fontFamily: "var(--font-mono)", minWidth: 0, cursor: "default" }}
                  />
                  <button
                    type="button"
                    onClick={handleChooseWorkingDirectory}
                    disabled={selectingFolder}
                    className="btn btn-glass"
                    style={{ padding: "10px 12px" }}
                  >
                    {selectingFolder ? <Loader2 size={14} className="spin" /> : <FolderOpen size={14} />}
                    {selectingFolder ? "选择中" : "选择"}
                  </button>
                  {settings.cliWorkingDirectory.trim() && (
                    <button
                      type="button"
                      onClick={handleClearWorkingDirectory}
                      className="btn btn-ghost"
                      style={{ padding: "10px 10px" }}
                      title="清空工作目录，恢复自动快照"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {folderPickerError && (
                  <div style={{ marginTop: 7, fontSize: 11.5, color: "rgb(var(--bad))", lineHeight: 1.45 }}>
                    {folderPickerError}
                  </div>
                )}
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>超时（秒）</label>
                <input type="number" min={15} max={1800} value={settings.cliTimeoutSeconds} onChange={(e) => setSettings({ ...settings, cliTimeoutSeconds: Number(e.target.value) })} className="input" style={{ fontFamily: "var(--font-mono)" }} />
              </div>
            </div>

            {/* Fallback behavior */}
            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <span className="eyebrow">Fallback · CLI 失败时</span>
                <div style={{ fontSize: 11.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                  CLI 报错或超时时的处理策略
                </div>
              </div>
              <PillToggle
                value={settings.cliFallbackBehavior}
                options={[
                  { value: "fail", label: "直接失败" },
                  { value: "api", label: "转 API" },
                  { value: "demo", label: "转 Demo" },
                ]}
                onChange={(v) => setSettings({ ...settings, cliFallbackBehavior: v })}
              />
            </div>

            {settings.cliProvider === "custom" && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
                  <div>
                    <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>命令</label>
                    <input value={settings.customCliCommand} onChange={(e) => setSettings({ ...settings, customCliCommand: e.target.value })} placeholder="my-agent" className="input" style={{ fontFamily: "var(--font-mono)" }} />
                  </div>
                  <div>
                    <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>参数</label>
                    <input value={settings.customCliArgs} onChange={(e) => setSettings({ ...settings, customCliArgs: e.target.value })} placeholder='run "{{prompt}}" --mode {{mode}} --model {{model}}' className="input" style={{ fontFamily: "var(--font-mono)" }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)", marginTop: 8, lineHeight: 1.5 }}>
                  可用模板变量：
                  <code style={{ color: "rgb(165 180 252)", margin: "0 4px" }}>{"{{prompt}}"}</code>
                  <code style={{ color: "rgb(165 180 252)", margin: "0 4px" }}>{"{{promptFile}}"}</code>
                  <code style={{ color: "rgb(165 180 252)", margin: "0 4px" }}>{"{{mode}}"}</code>
                  <code style={{ color: "rgb(165 180 252)", margin: "0 4px" }}>{"{{model}}"}</code>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer actions */}
      <div className="reveal flex items-center gap-3 mt-8">
        <button onClick={handleSave} disabled={saving} className="btn btn-aurora">
          {saving ? "保存中…" : saved ? "✓ 已保存" : "保存设置"}
        </button>
        {mode !== "demo" && (
          <button onClick={handleTest} disabled={testing} className="btn btn-glass">
            {testing ? "测试中…" : mode === "cli" ? "测试 CLI" : "测试连接"}
          </button>
        )}
        {saved && <span style={{ fontSize: 12, color: "rgb(var(--good))", fontFamily: "var(--font-mono)" }}>✓ 设置已保存，立即生效</span>}
      </div>

      {testResult && (
        <div
          className="reveal"
          style={{
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 13,
            color: testResult.ok ? "rgb(var(--good))" : "rgb(var(--bad))",
            background: testResult.ok ? "rgba(134,239,172,0.10)" : "rgba(248,113,113,0.10)",
            border: `1px solid ${testResult.ok ? "rgba(134,239,172,0.25)" : "rgba(248,113,113,0.25)"}`,
          }}
        >
          {testResult.message}
        </div>
      )}
    </div>
  )
}
