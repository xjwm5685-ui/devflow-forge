import { spawn } from "child_process"
import { stat } from "fs/promises"
import { platform } from "os"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ProcessResult {
  code: number | null
  stdout: string
  stderr: string
}

function runProcess(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: false,
      windowsHide: true,
    })

    let stdout = ""
    let stderr = ""
    let settled = false
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill()
        reject(new Error("选择文件夹超时，请重新点击选择。"))
      }
    }, 10 * 60 * 1000)

    child.stdout?.setEncoding("utf8")
    child.stderr?.setEncoding("utf8")
    child.stdout?.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr?.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("error", (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    child.on("close", (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ code, stdout, stderr })
    })
  })
}

function lastOutputLine(stdout: string): string {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1) ?? ""
}

function isCanceled(result: ProcessResult): boolean {
  const message = `${result.stdout}\n${result.stderr}`.toLowerCase()
  return (
    (result.code === 0 && !lastOutputLine(result.stdout) && !result.stderr.trim()) ||
    (result.code === 1 && !result.stdout.trim() && !result.stderr.trim()) ||
    message.includes("user canceled") ||
    message.includes("cancelled") ||
    message.includes("canceled") ||
    message.includes("-128")
  )
}

async function resultToPath(result: ProcessResult, toolName: string): Promise<string | null> {
  const selectedPath = lastOutputLine(result.stdout)
  if (result.code === 0 && selectedPath) return selectedPath
  if (isCanceled(result)) return null

  const message = result.stderr.trim() || result.stdout.trim() || `${toolName} exited with code ${result.code}`
  throw new Error(message)
}

async function pickFolderWindows(initialDirectory: string): Promise<string | null> {
  const script = `
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms | Out-Null
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "选择 DevFlow CLI 工作目录"
$dialog.ShowNewFolderButton = $true
$initial = $env:DEVFLOW_INITIAL_DIRECTORY
if ($initial -and (Test-Path -LiteralPath $initial -PathType Container)) {
  $dialog.SelectedPath = $initial
}
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.SelectedPath
}
`

  return resultToPath(
    await runProcess("powershell.exe", ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script], {
      ...process.env,
      DEVFLOW_INITIAL_DIRECTORY: initialDirectory,
    }),
    "powershell.exe"
  )
}

async function pickFolderMac(): Promise<string | null> {
  return resultToPath(
    await runProcess("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Select DevFlow CLI working directory")',
    ]),
    "osascript"
  )
}

function isMissingCommand(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}

async function pickFolderLinux(initialDirectory: string): Promise<string | null> {
  try {
    const args = ["--file-selection", "--directory", "--title=Select DevFlow CLI working directory"]
    if (initialDirectory) args.push(`--filename=${initialDirectory}`)
    return await resultToPath(await runProcess("zenity", args), "zenity")
  } catch (error) {
    if (!isMissingCommand(error)) throw error
  }

  try {
    return await resultToPath(
      await runProcess("kdialog", ["--title", "Select DevFlow CLI working directory", "--getexistingdirectory", initialDirectory || "."]),
      "kdialog"
    )
  } catch (error) {
    if (!isMissingCommand(error)) throw error
  }

  throw new Error("当前 Linux 环境未安装 zenity 或 kdialog，无法弹出文件夹选择器。")
}

async function pickFolder(initialDirectory: string): Promise<string | null> {
  switch (platform()) {
    case "win32":
      return pickFolderWindows(initialDirectory)
    case "darwin":
      return pickFolderMac()
    case "linux":
      return pickFolderLinux(initialDirectory)
    default:
      throw new Error(`当前系统 ${platform()} 暂不支持本地文件夹选择器。`)
  }
}

async function assertDirectory(selectedPath: string): Promise<void> {
  const info = await stat(selectedPath)
  if (!info.isDirectory()) {
    throw new Error("选择的路径不是文件夹。")
  }
}

let pickerLock: Promise<string | null> = Promise.resolve(null)

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let initialDirectory = ""
  try {
    const body = await request.json()
    if (typeof body?.initialDirectory === "string") {
      initialDirectory = body.initialDirectory
    }
  } catch {
    initialDirectory = ""
  }

  const prev = pickerLock
  let resolve: (value: string | null) => void
  pickerLock = new Promise((r) => { resolve = r })

  try {
    await prev
  } catch {
    // previous picker failed, proceed anyway
  }

  try {
    const selectedPath = await pickFolder(initialDirectory)
    if (!selectedPath) {
      resolve!(null)
      return NextResponse.json({ canceled: true, path: "" })
    }

    await assertDirectory(selectedPath)
    resolve!(selectedPath)
    return NextResponse.json({ canceled: false, path: selectedPath })
  } catch (error) {
    resolve!(null)
    const message = error instanceof Error ? error.message : "选择文件夹失败。"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
