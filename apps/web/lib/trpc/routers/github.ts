import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { TRPCError } from "@trpc/server"
import {
  GitHubApiError,
  createGitHubPullRequest,
  getGitHubFileContent,
  listGitHubBranches,
  listGitHubFiles,
  listGitHubRepos,
} from "@/lib/github/client"
import { getUserAccessToken } from "@/lib/github/token-store"
import {
  MOCK_FILE_CONTENTS,
  MOCK_FILE_TREE,
  MOCK_REPOS,
} from "@/lib/github/mock-data"
import type { TRPCContext } from "../context"

async function getGitHubToken(ctx: TRPCContext): Promise<string | null> {
  return getUserAccessToken(ctx.session!.id)
}

function requireGitHubToken(token: string | null): string {
  if (!token) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "GitHub is not connected. Sign in with GitHub or configure GITHUB_TOKEN.",
    })
  }
  return token
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true"
}

function mapGitHubError(error: unknown, action: string): TRPCError {
  if (error instanceof GitHubApiError) {
    console.warn(`[GitHub] ${action} failed: ${error.status} ${error.path} — ${error.responseBody.slice(0, 500)}`)
    if (error.status === 401 || error.status === 403) {
      return new TRPCError({
        code: "UNAUTHORIZED",
        message: "GitHub rejected the request. Reconnect your GitHub account.",
      })
    }
    if (error.status === 404) {
      return new TRPCError({
        code: "NOT_FOUND",
        message: "GitHub resource not found. Check the repository, branch, or path.",
      })
    }
    if (error.status === 422) {
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "GitHub rejected the request payload. Verify branch names and inputs.",
      })
    }
    return new TRPCError({
      code: "BAD_GATEWAY",
      message: `GitHub returned ${error.status}. Try again in a moment.`,
    })
  }
  console.error(`[GitHub] ${action} threw:`, error)
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "GitHub request failed." })
}

async function callGitHub<T>(action: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof TRPCError) throw error
    throw mapGitHubError(error, action)
  }
}

export const githubRouter = router({
  repos: protectedProcedure.query(async ({ ctx }) => {
    const token = await getGitHubToken(ctx)
    if (!token && isDemoMode()) return MOCK_REPOS
    return callGitHub("listRepos", () => listGitHubRepos(requireGitHubToken(token)))
  }),

  fileTree: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string().default("main"),
      path: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const token = await getGitHubToken(ctx)
      if (token) {
        return callGitHub("listFiles", () => listGitHubFiles({
          token,
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          path: input.path,
        }))
      }

      if (!isDemoMode()) requireGitHubToken(token)
      const prefix = input.path ?? ""
      return MOCK_FILE_TREE.filter((f) =>
        f.path.startsWith(prefix) &&
        f.path.slice(prefix.length).split("/").length <= (prefix ? 2 : 1)
      )
    }),

  fileContent: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      ref: z.string().default("main"),
    }))
    .query(async ({ ctx, input }) => {
      const token = await getGitHubToken(ctx)
      if (token) {
        return callGitHub("readFile", () => getGitHubFileContent({
          token,
          owner: input.owner,
          repo: input.repo,
          path: input.path,
          ref: input.ref,
        }))
      }

      if (!isDemoMode()) requireGitHubToken(token)
      return {
        content: MOCK_FILE_CONTENTS[input.path] ?? `// Content of ${input.path}`,
        encoding: "utf-8" as const,
      }
    }),

  branches: protectedProcedure
    .input(z.object({ owner: z.string(), repo: z.string() }))
    .query(async ({ ctx, input }) => {
      const token = await getGitHubToken(ctx)
      if (token) return callGitHub("listBranches", () => listGitHubBranches(token, input.owner, input.repo))

      if (!isDemoMode()) requireGitHubToken(token)
      return [
        { name: "main", default: true },
        { name: "develop", default: false },
        { name: "feature/auth-refactor", default: false },
      ]
    }),

  createPR: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string(),
      head: z.string(),
      base: z.string().default("main"),
    }))
    .mutation(async ({ ctx, input }) => {
      const token = requireGitHubToken(await getGitHubToken(ctx))
      return callGitHub("createPullRequest", () => createGitHubPullRequest({ token, ...input }))
    }),
})
