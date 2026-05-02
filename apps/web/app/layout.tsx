import type { Metadata } from "next"
import { Instrument_Serif, Manrope, JetBrains_Mono } from "next/font/google"
import { TRPCProvider } from "@/providers/trpc-provider"
import "./globals.css"

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
})

const sans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DevFlow Forge",
  description: "AI 驱动的全栈 DevOps 平台",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`h-full dark ${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <TRPCProvider>
          {children}
        </TRPCProvider>
      </body>
    </html>
  )
}
