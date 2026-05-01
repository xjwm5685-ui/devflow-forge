import { prisma } from "../db"
import { createSession, type SessionUser } from "./session"

const DEMO_USER = {
  githubId: 12345,
  login: "demo-user",
  email: "demo@devflow.dev",
  avatarUrl: "https://avatars.githubusercontent.com/u/12345",
}

export async function getOrCreateDemoUser(): Promise<SessionUser> {
  const user = await prisma.user.upsert({
    where: { githubId: DEMO_USER.githubId },
    update: {},
    create: {
      ...DEMO_USER,
      accessToken: "mock-token",
    },
  })

  return {
    id: user.id,
    githubId: user.githubId,
    login: user.login,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}

export async function loginAsDemo(): Promise<SessionUser> {
  const user = await getOrCreateDemoUser()
  await createSession(user)
  return user
}
