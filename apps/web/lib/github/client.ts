import type { GitHubFile, GitHubRepo } from "@devflow/shared"

const GITHUB_API = "https://api.github.com"

interface GitHubRepoResponse {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  default_branch: string
  language: string | null
  updated_at: string
}

interface GitHubBranchResponse {
  name: string
  protected?: boolean
}

interface GitHubContentResponse {
  name: string
  path: string
  type: "file" | "dir" | "symlink" | "submodule"
  size?: number
  sha?: string
  content?: string
  encoding?: string
}

interface GitHubPullResponse {
  id: number
  number: number
  title: string
  html_url: string
  state: string
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  url: string
  state: string
}

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
    public readonly path: string
  ) {
    super(`GitHub API ${status} on ${path}`)
    this.name = "GitHubApiError"
  }
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/")
}

export function parseRepo(repo: string | null | undefined): { owner: string; repo: string } | null {
  if (!repo) return null
  const trimmed = repo.trim()
  if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(trimmed)) return null
  const [owner, name] = trimmed.split("/")
  return { owner, repo: name }
}

async function githubFetch<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new GitHubApiError(response.status, body, path)
  }

  return response.json() as Promise<T>
}

export async function listGitHubRepos(token: string): Promise<GitHubRepo[]> {
  const repos = await githubFetch<GitHubRepoResponse[]>(
    token,
    "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member"
  )

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.private,
    defaultBranch: repo.default_branch,
    language: repo.language,
    updatedAt: repo.updated_at,
  }))
}

export async function listGitHubBranches(
  token: string,
  owner: string,
  repo: string
): Promise<Array<{ name: string; default: boolean }>> {
  const [branches, repoInfo] = await Promise.all([
    githubFetch<GitHubBranchResponse[]>(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`),
    githubFetch<GitHubRepoResponse>(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`),
  ])

  return branches.map((branch) => ({
    name: branch.name,
    default: branch.name === repoInfo.default_branch,
  }))
}

export async function listGitHubFiles(params: {
  token: string
  owner: string
  repo: string
  branch: string
  path?: string
}): Promise<GitHubFile[]> {
  const path = params.path ? `/${encodePath(params.path.replace(/\/$/, ""))}` : ""
  const data = await githubFetch<GitHubContentResponse[] | GitHubContentResponse>(
    params.token,
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/contents${path}?ref=${encodeURIComponent(params.branch)}`
  )

  const entries = Array.isArray(data) ? data : [data]
  return entries
    .filter((entry) => entry.type === "file" || entry.type === "dir")
    .map((entry) => ({
      path: entry.type === "dir" ? `${entry.path}/` : entry.path,
      type: entry.type === "dir" ? "dir" as const : "file" as const,
      size: entry.size,
      sha: entry.sha,
    }))
}

export async function getGitHubFileContent(params: {
  token: string
  owner: string
  repo: string
  path: string
  ref: string
}): Promise<{ content: string; encoding: "utf-8" }> {
  const data = await githubFetch<GitHubContentResponse>(
    params.token,
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/contents/${encodePath(params.path)}?ref=${encodeURIComponent(params.ref)}`
  )

  if (data.type !== "file" || !data.content) {
    throw new Error(`${params.path} is not a readable file`)
  }

  const content = data.encoding === "base64"
    ? Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8")
    : data.content

  return { content, encoding: "utf-8" }
}

export async function createGitHubPullRequest(params: {
  token: string
  owner: string
  repo: string
  title: string
  body: string
  head: string
  base: string
}): Promise<GitHubPullRequest> {
  const pr = await githubFetch<GitHubPullResponse>(
    params.token,
    `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
      }),
    }
  )

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    state: pr.state,
  }
}

const DEFAULT_EXCLUDED_DIRS = /(^|\/)(node_modules|\.next|dist|build|out|coverage|\.git|\.turbo|\.cache)(\/|$)/

export interface RepoFile {
  path: string
  content: string
  size: number
}

export async function fetchRepoSnapshot(params: {
  token: string
  owner: string
  repo: string
  branch: string
  fileFilter: (path: string, size: number | undefined) => boolean
  maxFiles: number
  maxBytesPerFile: number
  maxScannedDirs?: number
  maxApiCalls?: number
  concurrency?: number
}): Promise<RepoFile[]> {
  const {   
    token, owner, repo, branch, fileFilter,
    maxFiles, maxBytesPerFile,
    maxScannedDirs = 60,
    maxApiCalls = 200,
    concurrency = 5,
  } = params

  const collected: RepoFile[] = []
  const dirQueue: string[] = [""]
  const seenDirs = new Set<string>([""])
  let scannedDirs = 0
  let apiCallCount = 0

  const SOURCE_DIR_PRIORITY = /(^|\/)(src|lib|app|packages|server|core|internal|cmd|pkg|modules)(\/|$)/

  while (dirQueue.length > 0 && scannedDirs < maxScannedDirs && collected.length < maxFiles && apiCallCount < maxApiCalls) {
    dirQueue.sort((a, b) => {
      const aSrc = SOURCE_DIR_PRIORITY.test(a) ? 0 : 1
      const bSrc = SOURCE_DIR_PRIORITY.test(b) ? 0 : 1
      return aSrc - bSrc
    })
    const currentPath = dirQueue.shift()!
    scannedDirs++

    let entries: GitHubFile[]
    try {
      entries = await listGitHubFiles({ token, owner, repo, branch, path: currentPath || undefined })
      apiCallCount++
    } catch (err) {
      console.warn("[GitHubClient] Failed to list files at path:", currentPath, err)
      continue
    }

    const filesToFetch: Array<{ path: string; size: number | undefined }> = []
    for (const entry of entries) {
      if (entry.type === "dir") {
        const dirPath = entry.path.replace(/\/$/, "")
        if (DEFAULT_EXCLUDED_DIRS.test(dirPath)) continue
        if (seenDirs.has(dirPath)) continue
        seenDirs.add(dirPath)
        dirQueue.push(dirPath)
        continue
      }
      if (entry.size !== undefined && entry.size > maxBytesPerFile) continue
      if (!fileFilter(entry.path, entry.size)) continue
      filesToFetch.push({ path: entry.path, size: entry.size })
    }

    for (let i = 0; i < filesToFetch.length; i += concurrency) {
      if (collected.length >= maxFiles || apiCallCount >= maxApiCalls) break
      const batch = filesToFetch.slice(i, Math.min(i + concurrency, filesToFetch.length, i + (maxFiles - collected.length), maxApiCalls - apiCallCount))
      apiCallCount += batch.length
      const results = await Promise.all(
        batch.map(async (file) => {
          try {
            const { content } = await getGitHubFileContent({ token, owner, repo, path: file.path, ref: branch })
            return { path: file.path, content, size: file.size ?? content.length } satisfies RepoFile
          } catch (err) {
            console.warn("[GitHubClient] Failed to fetch file content:", file.path, err)
            return null
          }
        })
      )
      for (const r of results) {
        if (r && collected.length < maxFiles) collected.push(r)
      }
    }
  }

  return collected
}
