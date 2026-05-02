"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Github,
  Loader2,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
} from "lucide-react"

type LoginMode = "loading" | "demo" | "redirect" | "device" | "unconfigured"

interface DeviceFlowState {
  deviceCode: string
  userCode: string
  verificationUri: string
  verificationUriComplete?: string
  expiresAt: number
  interval: number
}

function modeLabel(mode: LoginMode): string {
  if (mode === "device") return "DEVICE FLOW"
  if (mode === "redirect") return "OAUTH REDIRECT"
  if (mode === "demo") return "DEMO SESSION"
  if (mode === "unconfigured") return "CONFIG NEEDED"
  return "CHECKING"
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<LoginMode>("loading")
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowState | null>(null)
  const [polling, setPolling] = useState(false)
  const [statusText, setStatusText] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/auth/github/config")
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        if (!data.hasClientId && data.mode !== "demo") {
          setMode("unconfigured")
          return
        }
        setMode(data.mode === "device" ? "device" : data.mode === "demo" ? "demo" : "redirect")
      })
      .catch(() => {
        if (active) setMode("unconfigured")
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!deviceFlow || !polling) return

    let canceled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      if (canceled || !deviceFlow) return
      if (Date.now() > deviceFlow.expiresAt) {
        setPolling(false)
        setError("验证码已过期，请重新发起登录。")
        return
      }

      try {
        const response = await fetch("/api/auth/github/device/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: deviceFlow.deviceCode }),
        })
        const data = await response.json().catch(() => null)

        if (response.ok && data?.ok) {
          setStatusText("GitHub 已授权，正在进入控制台。")
          setPolling(false)
          window.location.href = data.redirectTo ?? "/dashboard"
          return
        }

        if (response.status === 202) {
          const nextInterval = Number(data?.interval) > 0 ? Number(data.interval) : deviceFlow.interval
          timer = setTimeout(poll, nextInterval * 1000)
          return
        }

        throw new Error(data?.error ?? "GitHub 授权失败。")
      } catch (err) {
        setPolling(false)
        setError(err instanceof Error ? err.message : "GitHub 授权失败。")
      }
    }

    timer = setTimeout(poll, deviceFlow.interval * 1000)

    return () => {
      canceled = true
      if (timer) clearTimeout(timer)
    }
  }, [deviceFlow, polling, router])

  async function handleLogin() {
    setLoading(true)
    setError(null)
    setStatusText("")

    if (mode === "redirect" || mode === "demo") {
      router.push("/api/auth/github")
      return
    }

    if (mode === "unconfigured") {
      setLoading(false)
      setError("缺少 GitHub OAuth 配置。")
      return
    }

    try {
      const response = await fetch("/api/auth/github/device/start", { method: "POST" })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? "无法启动 GitHub Device Flow。")

      if (data?.demo) {
        window.location.href = data.redirectTo ?? "/dashboard"
        return
      }

      const nextDeviceFlow: DeviceFlowState = {
        deviceCode: data.deviceCode,
        userCode: data.userCode,
        verificationUri: data.verificationUri,
        verificationUriComplete: data.verificationUriComplete,
        expiresAt: Date.now() + Number(data.expiresIn ?? 900) * 1000,
        interval: Number(data.interval ?? 5),
      }
      setDeviceFlow(nextDeviceFlow)
      setPolling(true)
      setStatusText("等待 GitHub 授权。")
      window.open(data.verificationUriComplete ?? data.verificationUri, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub 登录失败。")
    } finally {
      setLoading(false)
    }
  }

  async function copyUserCode() {
    if (!deviceFlow?.userCode) return
    await navigator.clipboard.writeText(deviceFlow.userCode).catch(() => {})
    setStatusText("验证码已复制。")
  }

  function cancelDeviceFlow() {
    setPolling(false)
    setDeviceFlow(null)
    setStatusText("")
    setError(null)
  }

  const busy = loading || mode === "loading"
  const notice = error ?? statusText

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="DevFlow Forge 登录">
        <div className="login-visual">
          <div className="login-brand-row">
            <div className="login-mark">
              <Sparkles size={19} />
            </div>
            <div>
              <div className="login-brand-name">DevFlow Forge</div>
              <div className="login-brand-subtitle">Local agent workbench</div>
            </div>
          </div>

          <div className="login-command-panel">
            <div className="login-command-title">
              <Terminal size={15} />
              <span>runbook</span>
            </div>
            <div className="login-command-lines">
              <span><b>01</b> connect github identity</span>
              <span><b>02</b> import repository context</span>
              <span><b>03</b> dispatch coding agents</span>
            </div>
          </div>

          <div className="login-status-grid" aria-hidden="true">
            {[
              ["ARCH", "design"],
              ["CODE", "patch"],
              ["QA", "verify"],
              ["OPS", "ship"],
            ].map(([label, value]) => (
              <div className="login-status-cell" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="login-panel">
          <div className="login-panel-header">
            <div className="login-mode-pill">
              <span className={polling ? "login-live-dot login-live-dot-on" : "login-live-dot"} />
              {modeLabel(mode)}
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="login-title-block">
            <h1>登录控制台</h1>
            <p>使用 GitHub 授权后，DevFlow 会把访问令牌加密保存在当前本机。</p>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={busy}
            className="login-primary-button"
          >
            {busy ? <Loader2 size={18} className="spin" /> : <Github size={18} />}
            <span>{busy ? "准备中" : mode === "device" ? "获取 GitHub 验证码" : "使用 GitHub 登录"}</span>
          </button>

          {deviceFlow && (
            <div className="login-device-card">
              <div className="login-device-heading">
                <div>
                  <span>GitHub Code</span>
                  <strong>{polling ? "等待授权" : "已暂停"}</strong>
                </div>
                <button type="button" onClick={cancelDeviceFlow} aria-label="取消 GitHub 授权">
                  <X size={15} />
                </button>
              </div>

              <button type="button" onClick={copyUserCode} className="login-code-button">
                {deviceFlow.userCode}
                <Copy size={15} />
              </button>

              <div className="login-device-actions">
                <a
                  href={deviceFlow.verificationUriComplete ?? deviceFlow.verificationUri}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开 GitHub
                  <ExternalLink size={14} />
                </a>
                <button type="button" onClick={copyUserCode}>复制验证码</button>
              </div>
            </div>
          )}

          {notice && (
            <div className={error ? "login-message login-message-error" : "login-message"}>
              {error ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              <span>{notice}</span>
            </div>
          )}

          <div className="login-footnote">
            <span>OAuth scope</span>
            <code>repo read:org</code>
          </div>
        </div>
      </section>
    </main>
  )
}
