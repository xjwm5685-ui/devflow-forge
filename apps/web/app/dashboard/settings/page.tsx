"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

interface Settings {
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
  demoMode: boolean
  hasApiKey: boolean
}

const PROVIDERS = [
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4o-mini"] },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-coder"] },
  { name: "小米 MiMo", baseUrl: "https://api.xiaomi.com/v1", models: ["MiMo-v2.5-Pro"] },
  { name: "Moonshot", baseUrl: "https://api.moonshot.cn/v1", models: ["moonshot-v1-8k", "moonshot-v1-32k"] },
  { name: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", models: ["glm-4", "glm-4-flash"] },
  { name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", models: ["qwen-max", "qwen-plus"] },
  { name: "本地 Ollama", baseUrl: "http://localhost:11434/v1", models: ["llama3", "qwen2.5"] },
  { name: "自定义", baseUrl: "", models: [] },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ openaiApiKey: "", openaiBaseUrl: "https://api.openai.com/v1", openaiModel: "gpt-4o", demoMode: true, hasApiKey: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [selectedProvider, setSelectedProvider] = useState("OpenAI")

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      setSettings(data)
      const provider = PROVIDERS.find((p) => p.baseUrl === data.openaiBaseUrl)
      if (provider) setSelectedProvider(provider.name)
    }).catch(console.error)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch {} finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/test")
      setTestResult(await res.json())
    } catch { setTestResult({ ok: false, message: "连接失败" }) } finally { setTesting(false) }
  }

  return (
    <div className="p-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">设置</h1>
        <p className="text-sm text-text-tertiary mt-1">配置 AI 模型和 API 密钥</p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-surface-1 border border-surface-border rounded-lg p-5 mt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">运行模式</h2>
        <div className="flex gap-3">
          {[{ val: true, label: "演示模式", desc: "使用预录回复，无需 API 密钥" }, { val: false, label: "实时模式", desc: "调用真实 AI 模型，需要 API 密钥" }].map((m) => (
            <button key={String(m.val)} onClick={() => setSettings({ ...settings, demoMode: m.val })}
              className={`flex-1 p-4 rounded-lg border text-left transition-colors ${
                settings.demoMode === m.val ? "bg-accent-dim border-accent/30 text-accent-light" : "bg-surface-2 border-surface-border text-text-secondary hover:border-surface-border-light"
              }`}>
              <div className="text-[13px] font-semibold mb-0.5">{m.label}</div>
              <div className="text-xs text-text-muted">{m.desc}</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Provider Selection */}
      {!settings.demoMode && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-surface-1 border border-surface-border rounded-lg p-5 mt-4">
          <h2 className="text-sm font-semibold text-text-primary mb-4">API 提供商</h2>
          <div className="grid grid-cols-4 gap-2">
            {PROVIDERS.map((p) => (
              <button key={p.name} onClick={() => {
                setSelectedProvider(p.name)
                if (p.baseUrl) setSettings((s) => ({ ...s, openaiBaseUrl: p.baseUrl }))
                if (p.models.length > 0) setSettings((s) => ({ ...s, openaiModel: p.models[0]! }))
              }} className={`p-3 rounded-lg border text-[13px] font-medium transition-colors ${
                selectedProvider === p.name ? "bg-accent-dim border-accent/30 text-accent-light" : "bg-surface-2 border-surface-border text-text-secondary hover:border-surface-border-light"
              }`}>{p.name}</button>
            ))}
          </div>
        </motion.div>
      )}

      {/* API Config */}
      {!settings.demoMode && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-surface-1 border border-surface-border rounded-lg p-5 mt-4">
          <h2 className="text-sm font-semibold text-text-primary mb-4">API 配置</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">API 密钥</label>
              <input type="password" value={settings.openaiApiKey} onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                placeholder={settings.hasApiKey ? "已配置（输入新密钥以更换）" : "sk-..."}
                className="w-full bg-surface-2 border border-surface-border rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 font-mono" />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Base URL</label>
              <input type="text" value={settings.openaiBaseUrl} onChange={(e) => setSettings({ ...settings, openaiBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-surface-2 border border-surface-border rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 font-mono" />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">模型 ID</label>
              <input type="text" value={settings.openaiModel} onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
                placeholder="gpt-4o"
                className="w-full bg-surface-2 border border-surface-border rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 font-mono" />
              {PROVIDERS.find((p) => p.name === selectedProvider)?.models && (
                <div className="flex gap-1.5 mt-2">
                  {PROVIDERS.find((p) => p.name === selectedProvider)?.models.map((model) => (
                    <button key={model} onClick={() => setSettings({ ...settings, openaiModel: model })}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        settings.openaiModel === model ? "bg-accent text-white" : "bg-surface-3 text-text-muted hover:text-text-secondary"
                      }`}>{model}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 mt-6">
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 bg-accent text-white rounded-md hover:bg-accent-light transition-colors text-sm font-medium disabled:opacity-50">
          {saving ? "保存中..." : saved ? "已保存" : "保存设置"}
        </button>
        {!settings.demoMode && settings.hasApiKey && (
          <button onClick={handleTest} disabled={testing}
            className="px-5 py-2 bg-surface-2 border border-surface-border text-text-secondary rounded-md hover:text-text-primary transition-colors text-sm font-medium disabled:opacity-50">
            {testing ? "测试中..." : "测试连接"}
          </button>
        )}
        {saved && <span className="text-xs text-success">设置已保存，立即生效</span>}
      </motion.div>

      {testResult && (
        <div className={`mt-4 p-3 rounded-md text-sm ${testResult.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {testResult.message}
        </div>
      )}

      {/* Info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        className="mt-8 bg-surface-1 border border-surface-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">说明</h3>
        <div className="space-y-2 text-xs text-text-muted">
          <p><strong className="text-text-secondary">演示模式：</strong>智能体返回预录回复，无需 API 密钥，适合体验界面和工作流。</p>
          <p><strong className="text-text-secondary">实时模式：</strong>调用真实 AI 模型。支持所有 OpenAI 兼容接口（OpenAI、DeepSeek、MiMo、Moonshot、智谱、千问、本地 Ollama 等）。</p>
          <p><strong className="text-text-secondary">自动降级：</strong>如果实时模式 API 调用失败，智能体会自动降级到演示回复。</p>
        </div>
      </motion.div>
    </div>
  )
}
