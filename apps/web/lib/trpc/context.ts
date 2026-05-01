import { prisma } from "../db"
import { getSession, type SessionUser } from "../auth/session"

export interface TRPCContext {
  db: typeof prisma
  session: SessionUser | null
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await getSession()
  return {
    db: prisma,
    session,
  }
}
