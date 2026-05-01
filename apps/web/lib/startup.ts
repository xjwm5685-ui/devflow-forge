import { recoverStuckTasks } from "./queue/recover"

let initialized = false

export async function ensureInitialized(): Promise<void> {
  if (initialized) return
  initialized = true

  try {
    await recoverStuckTasks()
  } catch (error) {
    console.error("[Startup] Recovery failed:", error)
  }
}
