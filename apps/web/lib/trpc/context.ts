import { prisma } from "../db"
import { getSession, type SessionUser } from "../auth/session"
import { ensureInitialized } from "../startup"

export interface TRPCContext {
  db: typeof prisma
  session: SessionUser | null
}

export async function createTRPCContext(): Promise<TRPCContext> {
  await ensureInitialized()
  const session = await getSession()
  return {
    db: prisma,
    session,
  }
}
