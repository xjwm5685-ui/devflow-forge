"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    setLoading(true)
    router.push("/api/auth/github")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 max-w-lg px-12">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center mb-6 border border-indigo-500/20">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h1 className="text-4xl font-semibold text-zinc-100 tracking-tight leading-tight mb-3">DevFlow Forge</h1>
            <p className="text-lg text-zinc-400 leading-relaxed">多智能体协同开发平台</p>
          </div>
          <div className="space-y-4">
            {["架构师 Agent 自动分析代码库", "编码 Agent 生成并修改代码", "QA Agent 自动生成测试用例", "DevOps Agent 一键部署上线"].map((text, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                <span className="text-sm">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-zinc-950">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center mb-4 border border-indigo-500/20">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">DevFlow Forge</h1>
          </div>

          <h2 className="text-xl font-semibold text-zinc-100 mb-1">登录</h2>
          <p className="text-sm text-zinc-500 mb-8">使用 GitHub 账号登录以开始使用</p>

          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-zinc-100 text-zinc-900 font-medium py-3 px-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50 cursor-pointer">
            {loading ? (
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            )}
            {loading ? "跳转中..." : "使用 GitHub 登录"}
          </button>

          <p className="text-xs text-zinc-600 text-center mt-6">登录即表示你同意我们的服务条款</p>
        </motion.div>
      </div>
    </div>
  )
}
