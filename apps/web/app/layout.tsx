import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { TRPCProvider } from "@/providers/trpc-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DevFlow Forge - AI-Powered DevOps Platform",
  description: "Multi-agent AI system for automated code refactoring, testing, and deployment",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <TRPCProvider>
          {children}
        </TRPCProvider>
      </body>
    </html>
  )
}
