import { prisma } from "@/lib/db"
import { generateNarration } from "./audio-generator"
import { generateVideo } from "./video-generator"
import { fetchRepoSnapshot, parseRepo } from "@/lib/github/client"
import { getUserAccessToken } from "@/lib/github/token-store"
import { basename } from "path"

interface GenerateDocumentParams {
  projectId: string
  title: string
  options: {
    includeDiagrams: boolean
    includeNarration: boolean
    includeVideo: boolean
  }
}

function isDocumentationFile(path: string): boolean {
  return /\.(cjs|css|go|html|js|json|jsx|md|mjs|py|rs|tsx?|yaml|yml)$/i.test(path) ||
    ["Dockerfile", "requirements.txt", "pyproject.toml", "go.mod"].includes(path)
}

async function loadRepositoryFiles(params: {
  token: string | null
  githubRepo: string | null
  githubBranch: string | null
}): Promise<Array<{ path: string; content: string }> | null> {
  const repoRef = parseRepo(params.githubRepo)
  if (!repoRef || !params.token) return null

  const branch = params.githubBranch ?? "main"
  const files = await fetchRepoSnapshot({
    token: params.token,
    owner: repoRef.owner,
    repo: repoRef.repo,
    branch,
    fileFilter: isDocumentationFile,
    maxFiles: 35,
    maxBytesPerFile: 120_000,
    maxScannedDirs: 25,
  })
  return files.length > 0 ? files.map(({ path, content }) => ({ path, content })) : null
}

function summarizeFiles(files: Array<{ path: string; content: string }> | null): string {
  if (!files?.length) {
    return "No live repository files were available. This document summarizes the project metadata and configured workflow surface."
  }

  const groups = new Map<string, number>()
  for (const file of files) {
    const ext = file.path.includes(".") ? file.path.split(".").pop()!.toLowerCase() : file.path
    groups.set(ext, (groups.get(ext) ?? 0) + 1)
  }

  const summary = [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `${count} ${ext} file${count === 1 ? "" : "s"}`)
    .join(", ")

  return `Repository sample: ${summary}. Key files scanned: ${files.slice(0, 12).map((f) => f.path).join(", ")}.`
}

function inferStack(files: Array<{ path: string; content: string }> | null): string {
  if (!files?.length) return "Stack could not be inferred from repository files."

  const paths = new Set(files.map((f) => f.path))
  const pkg = files.find((f) => f.path === "package.json")
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg.content) as {
        scripts?: Record<string, string>
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      const deps = { ...parsed.dependencies, ...parsed.devDependencies }
      const frameworks = [
        deps.next ? "Next.js" : null,
        deps.react ? "React" : null,
        deps["@trpc/server"] ? "tRPC" : null,
        deps.prisma || deps["@prisma/client"] ? "Prisma" : null,
        deps.express ? "Express" : null,
      ].filter(Boolean)
      const scripts = parsed.scripts ? Object.keys(parsed.scripts).join(", ") : "none"
      return `Detected Node project${frameworks.length ? ` using ${frameworks.join(", ")}` : ""}. Package scripts: ${scripts}.`
    } catch (err) {
      console.warn("[Pipeline] Failed to parse package.json:", err)
      return "Detected Node project, but package.json could not be parsed."
    }
  }
  if (paths.has("requirements.txt") || paths.has("pyproject.toml")) return "Detected Python project."
  if (paths.has("go.mod")) return "Detected Go project."
  return "Stack inferred from sampled files is mixed or custom."
}

export async function generateDocument(docId: string, params: GenerateDocumentParams): Promise<void> {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: { userId: true },
    })

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
    })

    const userToken = doc?.userId ? await getUserAccessToken(doc.userId) : null
    const files = await loadRepositoryFiles({
      token: userToken,
      githubRepo: project?.githubRepo ?? null,
      githubBranch: project?.githubBranch ?? null,
    }).catch(() => null)

    // Generate document content
    const content = {
      title: params.title,
      sections: [
        {
          heading: "Overview",
          content: `${project?.name ?? "This project"}${project?.githubRepo ? ` is connected to ${project.githubRepo}` : ""}. ${project?.description ?? "No project description was provided."}`,
        },
        {
          heading: "Repository Structure",
          content: summarizeFiles(files),
        },
        {
          heading: "Technology Stack",
          content: inferStack(files),
        },
        {
          heading: "Operational Notes",
          content: `Configured branch: ${project?.githubBranch ?? "main"}. Generated documentation is based on metadata${files?.length ? " and a sampled repository file set" : ""}. Review generated diagrams before using them as authoritative architecture documentation.`,
        },
      ],
    }

    const diagrams = params.options.includeDiagrams ? [
      {
        type: "architecture",
        title: "System Architecture",
        mermaid: `graph TB
    Repo[${project?.githubRepo ?? "Repository"}] --> App[Application]
    App --> Build[Build/Test Workflow]
    Build --> Deploy[Deployment]
    App --> Docs[Generated Documentation]`,
      },
      {
        type: "sequence",
        title: "Workflow Execution",
        mermaid: `sequenceDiagram
    User->>DevFlow: Start workflow
    DevFlow->>Repository: Load project context
    DevFlow->>Agents: Execute configured agent steps
    Agents-->>DevFlow: Analysis and artifacts
    DevFlow-->>User: Task result`,
      },
    ] : []

    // Generate audio narration if requested
    let audioUrl: string | undefined
    if (params.options.includeNarration) {
      const narrationText = content.sections.map((s) => `${s.heading}. ${s.content}`).join("\n\n")
      const audioResult = await generateNarration({
        text: narrationText,
        outputDir: `storage/audio/${docId}`,
      })
      if (audioResult.success && audioResult.filePath) {
        audioUrl = `/api/generated/audio/${docId}/${basename(audioResult.filePath)}`
      }
    }

    // Generate video slideshow if requested
    let videoUrl: string | undefined
    if (params.options.includeVideo) {
      const slides = [
        { type: "title" as const, title: params.title, content: project?.name ?? "", duration: 5 },
        ...content.sections.map((s) => ({
          type: "text" as const,
          title: s.heading,
          content: s.content.slice(0, 500),
          duration: 8,
        })),
        ...diagrams.map((d) => ({
          type: "diagram" as const,
          title: d.title,
          content: d.mermaid,
          duration: 10,
        })),
      ]

      const videoResult = await generateVideo({
        slides,
        title: params.title,
        outputDir: `storage/video/${docId}`,
      })
      if (videoResult.success && videoResult.htmlPath) {
        videoUrl = `/api/generated/video/${docId}/${basename(videoResult.htmlPath)}`
      }
    }

    // Update document in database
    await prisma.document.update({
      where: { id: docId },
      data: {
        content: JSON.stringify(content),
        diagrams: JSON.stringify(diagrams),
        audioUrl: audioUrl ?? undefined,
        videoUrl: videoUrl ?? undefined,
        status: "COMPLETED",
      },
    })
  } catch (err) {
    console.error("[Pipeline] Document generation failed:", err)
    await prisma.document.update({
      where: { id: docId },
      data: { status: "FAILED" },
    })
  }
}
