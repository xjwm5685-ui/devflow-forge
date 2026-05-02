"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { trpc } from "@/lib/trpc/client"

const NAV = [
  { href: "/dashboard", label: "概览", english: "Overview", icon: "grid" },
  { href: "/dashboard/projects", label: "项目", english: "Projects", icon: "folder" },
  { href: "/dashboard/agents", label: "智能体", english: "Agents", icon: "bot" },
  { href: "/dashboard/templates", label: "模板", english: "Templates", icon: "layout" },
  { href: "/dashboard/settings", label: "设置", english: "Settings", icon: "settings" },
] as const

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.6" /><rect x="14" y="3" width="7" height="7" rx="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.6" /><rect x="14" y="14" width="7" height="7" rx="1.6" /></>,
    folder: <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
    bot: <><rect x="4" y="8" width="16" height="12" rx="2.5" /><circle cx="9" cy="14" r="1" fill="currentColor" /><circle cx="15" cy="14" r="1" fill="currentColor" /><path d="M8 4h8M12 4v4" /></>,
    layout: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
    spark: <path d="M12 2v6m0 8v6m10-10h-6M8 12H2m15.5-7.5l-4.2 4.2M9.7 14.3l-4.2 4.2m0-13l4.2 4.2m4.6 4.6l4.2 4.2" />,
  }
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const { data: user } = trpc.user.me.useQuery()

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Floating decoration orbs (in addition to body aurora) */}
      <div className="orb" style={{ width: 420, height: 420, top: "-120px", left: "30%", background: "radial-gradient(circle, rgba(240,171,252,0.55), transparent 70%)" }} />
      <div className="orb" style={{ width: 360, height: 360, bottom: "-100px", right: "10%", background: "radial-gradient(circle, rgba(125,211,252,0.45), transparent 70%)", animationDelay: "-6s" }} />

      {/* Sidebar — floating glass column */}
      <aside
        className="fixed glass-strong glass-edge"
        style={{ top: 16, left: 16, bottom: 16, width: 232, display: "flex", flexDirection: "column", padding: "20px 14px", zIndex: 30 }}
      >
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 mb-6 reveal">
          <span
            className="flex items-center justify-center"
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: "linear-gradient(135deg, rgba(240,171,252,0.4), rgba(125,211,252,0.4))",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px -6px rgba(240,171,252,0.4)",
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgb(8,6,24)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </span>
          <div style={{ lineHeight: 1.05 }}>
            <div className="headline" style={{ fontSize: 20 }}>
              Dev<em>flow</em>
            </div>
            <div className="eyebrow" style={{ fontSize: 8.5, marginTop: 2 }}>Forge · OS</div>
          </div>
        </Link>

        <div className="eyebrow px-3 mb-2" style={{ fontSize: 9 }}>Workspace</div>
        <nav className="flex flex-col gap-1 mb-6">
          {NAV.map((item, idx) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="reveal"
                style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? "rgb(8 6 24)" : "rgb(var(--fg-3))",
                  background: active
                    ? "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(220,225,255,0.85))"
                    : "transparent",
                  border: active ? "1px solid rgba(255,255,255,0.5)" : "1px solid transparent",
                  boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 20px -8px rgba(240,171,252,0.35)" : "none",
                  animationDelay: `${idx * 60}ms`,
                  transition: "color 0.25s, background 0.35s",
                }}
              >
                <Icon name={item.icon} className="w-4 h-4 flex-shrink-0" />
                <span style={{ flex: 1 }}>{item.label}</span>
                {active && (
                  <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", opacity: 0.6 }}>·{String(idx + 1).padStart(2, "0")}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Status orb */}
        <div className="glass-soft pane-tight reveal" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="dot dot-pulse" style={{ background: "rgb(var(--good))", color: "rgb(var(--good))" }} />
            <span className="eyebrow" style={{ fontSize: 9.5 }}>SYS · ONLINE</span>
          </div>
          <div style={{ fontSize: 11, color: "rgb(var(--fg-3))", lineHeight: 1.4 }}>
            4 agent · queue idle · cache warm
          </div>
        </div>

        {/* User card pinned at bottom */}
        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <div className="divider" style={{ marginBottom: 12 }} />
          <div className="flex items-center gap-3 px-2">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, rgba(240,171,252,0.35), rgba(125,211,252,0.35))",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                color: "rgb(var(--fg-1))",
                fontSize: 12, fontWeight: 600,
              }}
            >
              {(user?.login ?? "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgb(var(--fg-1))" }} className="truncate">{user?.login ?? "user"}</div>
              <div style={{ fontSize: 10.5, color: "rgb(var(--fg-4))", fontFamily: "var(--font-mono)" }}>connected</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="退出登录"
              className="btn-ghost"
              style={{ padding: 6, borderRadius: 8 }}
            >
              <Icon name="logout" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ marginLeft: 264, minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  )
}
