import type { Metadata } from "next"
import { TRPCProvider } from "@/providers/trpc-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "DevFlow Forge",
  description: "AI 驱动的全栈 DevOps 平台",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col">
        <TRPCProvider>
          {children}
        </TRPCProvider>
      </body>
    </html>
  )
}
