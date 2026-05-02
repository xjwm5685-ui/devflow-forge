import { mkdir, rm, writeFile } from "fs/promises"
import path from "path"

const WORKSPACE_ROOT = path.resolve(process.cwd(), "storage", "cli-workspaces")

function isPathInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child)
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel)
}

/**
 * Materialize repository files for a CLI run into an isolated directory under
 * `storage/cli-workspaces/<taskId>/`. Returns the absolute path the CLI should
 * use as its cwd. This guarantees the CLI never operates inside the DevFlow
 * Forge app directory itself, even when "workspace-write" is enabled.
 */
export async function prepareCliWorkspace(
  taskId: string,
  files: Array<{ path: string; content: string }>
): Promise<string> {
  const workspace = path.resolve(WORKSPACE_ROOT, taskId)
  await mkdir(workspace, { recursive: true })

  for (const file of files) {
    const normalized = path.normalize(file.path).replace(/^([./\\]+)/, "")
    const target = path.resolve(workspace, normalized)
    if (!isPathInside(target, workspace)) {
      // Defense-in-depth against malicious paths from the GitHub snapshot.
      continue
    }
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, file.content, "utf-8")
  }

  return workspace
}

export async function cleanupCliWorkspace(workspace: string | null | undefined): Promise<void> {
  if (!workspace) return
  const resolved = path.resolve(workspace)
  if (!isPathInside(resolved, WORKSPACE_ROOT)) return
  await rm(resolved, { recursive: true, force: true }).catch(() => {})
}

/**
 * True if the candidate directory is a safe place to let a CLI write files.
 * Currently: must be absolute, must NOT equal the DevFlow Forge app directory
 * or any ancestor of it (which would risk overwriting the app source itself).
 */
export function isSafeWritableCwd(candidate: string): boolean {
  if (!candidate) return false
  if (!path.isAbsolute(candidate)) return false

  const appCwd = path.resolve(process.cwd())
  const target = path.resolve(candidate)

  if (target === appCwd) return false
  if (isPathInside(appCwd, target)) return false  // target is an ancestor of app cwd
  return true
}
