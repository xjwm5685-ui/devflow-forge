import { recoverStuckTasks } from "./queue/recover"

let initPromise: Promise<void> | null = null

export async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = recoverStuckTasks().catch((error) => {
      console.error("[Startup] Recovery failed:", error)
    })
  }
  return initPromise
}
