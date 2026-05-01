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
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"] },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-coder"] },
  { name: "MiMo (Xiaomi)", baseUrl: "https://api.xiaomi.com/v1", models: ["MiMo-v2.5-Pro"] },
  { name: "Moonshot", baseUrl: "https://api.moonshot.cn/v1", models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"] },
  { name: "Zhipu (GLM)", baseUrl: "https://open.bigmodel.cn/api/paas/v4", models: ["glm-4", "glm-4-flash"] },
  { name: "Qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", models: ["qwen-max", "qwen-plus", "qwen-turbo"] },
  { name: "Local (Ollama)", baseUrl: "http://localhost:11434/v1", models: ["llama3", "qwen2.5", "deepseek-coder"] },
  { name: "Custom", baseUrl: "", models: [] },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    openaiApiKey: "",
    openaiBaseUrl: "https://api.openai.com/v1",
    openaiModel: "gpt-4o",
    demoMode: true,
    hasApiKey: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [selectedProvider, setSelectedProvider] = useState("OpenAI")

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data)
        // Detect provider
        const provider = PROVIDERS.find((p) => p.baseUrl === data.openaiBaseUrl)
        if (provider) setSelectedProvider(provider.name)
      })
      .catch(console.error)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiApiKey: settings.openaiApiKey,
          openaiBaseUrl: settings.openaiBaseUrl,
          openaiModel: settings.openaiModel,
          demoMode: settings.demoMode,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/test")
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ ok: false, message: "Failed to connect" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Configure your AI model and API credentials</p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6"
      >
        <h2 className="font-semibold text-white mb-4">Operating Mode</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setSettings({ ...settings, demoMode: true })}
            className={`flex-1 p-4 rounded-lg border transition-all ${
              settings.demoMode
                ? "bg-amber-600/10 border-amber-600/40 text-amber-400"
                : "bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            <div className="text-lg font-semibold mb-1">Demo Mode</div>
            <div className="text-sm opacity-70">Pre-recorded responses, no API key needed</div>
          </button>
          <button
            onClick={() => setSettings({ ...settings, demoMode: false })}
            className={`flex-1 p-4 rounded-lg border transition-all ${
              !settings.demoMode
                ? "bg-indigo-600/10 border-indigo-600/40 text-indigo-400"
                : "bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            <div className="text-lg font-semibold mb-1">Live Mode</div>
            <div className="text-sm opacity-70">Real AI model, requires API key</div>
          </button>
        </div>
      </motion.div>

      {/* Provider Selection */}
      {!settings.demoMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6"
        >
          <h2 className="font-semibold text-white mb-4">API Provider</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.name}
                onClick={() => {
                  setSelectedProvider(provider.name)
                  if (provider.baseUrl) {
                    setSettings({ ...settings, openaiBaseUrl: provider.baseUrl })
                  }
                  if (provider.models.length > 0) {
                    setSettings((s) => ({ ...s, openaiModel: provider.models[0]! }))
                  }
                }}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  selectedProvider === provider.name
                    ? "bg-indigo-600/10 border-indigo-600/40 text-indigo-400"
                    : "bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {provider.name}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* API Configuration */}
      {!settings.demoMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6"
        >
          <h2 className="font-semibold text-white mb-4">API Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">API Key</label>
              <input
                type="password"
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                placeholder={settings.hasApiKey ? "Key configured (enter new to change)" : "sk-..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-600 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Base URL</label>
              <input
                type="text"
                value={settings.openaiBaseUrl}
                onChange={(e) => setSettings({ ...settings, openaiBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-600 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Model</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.openaiModel}
                  onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
                  placeholder="gpt-4o"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-600 font-mono text-sm"
                />
              </div>
              {/* Quick model select */}
              {PROVIDERS.find((p) => p.name === selectedProvider)?.models && (
                <div className="flex gap-2 mt-2">
                  {PROVIDERS.find((p) => p.name === selectedProvider)?.models.map((model) => (
                    <button
                      key={model}
                      onClick={() => setSettings({ ...settings, openaiModel: model })}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        settings.openaiModel === model
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>

        {!settings.demoMode && settings.hasApiKey && (
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-6 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
        )}

        {saved && (
          <span className="text-sm text-emerald-400">Settings saved. Changes take effect immediately.</span>
        )}
      </motion.div>

      {/* Test Result */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-4 p-4 rounded-lg border ${
            testResult.ok
              ? "bg-emerald-600/10 border-emerald-600/30 text-emerald-400"
              : "bg-red-600/10 border-red-600/30 text-red-400"
          }`}
        >
          {testResult.message}
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 bg-gray-900/30 border border-gray-800 rounded-xl p-6"
      >
        <h3 className="font-semibold text-white mb-3">How it works</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong className="text-gray-300">Demo Mode:</strong> Agents return pre-recorded responses. No API key needed. Good for testing the UI and workflow.</p>
          <p><strong className="text-gray-300">Live Mode:</strong> Agents call a real LLM API. Supports any OpenAI-compatible provider (OpenAI, DeepSeek, MiMo, Moonshot, Qwen, local Ollama, etc.)</p>
          <p><strong className="text-gray-300">Auto-fallback:</strong> If Live Mode is enabled but the API call fails, the agent automatically falls back to demo responses for that request.</p>
        </div>
      </motion.div>
    </div>
  )
}
