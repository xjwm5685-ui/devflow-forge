import { createSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db"
import { encryptToken } from "@/lib/github/token-store"

export function getGitHubOAuthScope(): string {
  return process.env.GITHUB_OAUTH_SCOPE?.trim() || "repo read:org"
}

export async function completeGitHubLogin(accessToken: string): Promise<string> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (!userRes.ok) {
    throw new Error("Failed to fetch GitHub user profile")
  }

  const ghUser = (await userRes.json()) as {
    id: number
    login: string
    email: string | null
    avatar_url: string | null
  }

  const encryptedToken = encryptToken(accessToken)

  const user = await prisma.user.upsert({
    where: { githubId: ghUser.id },
    update: {
      login: ghUser.login,
      email: ghUser.email,
      avatarUrl: ghUser.avatar_url,
      accessToken: encryptedToken,
    },
    create: {
      githubId: ghUser.id,
      login: ghUser.login,
      email: ghUser.email,
      avatarUrl: ghUser.avatar_url,
      accessToken: encryptedToken,
    },
  })

  return createSession({
    id: user.id,
    githubId: user.githubId,
    login: user.login,
    email: user.email,
    avatarUrl: user.avatarUrl,
  })
}
