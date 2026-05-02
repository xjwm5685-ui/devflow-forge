import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { getSessionSecret } from "@/lib/auth/secret"

const PREFIX = "enc:v1:"
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const explicit = process.env.TOKEN_ENCRYPTION_KEY
  if (explicit) {
    if (/^[0-9a-fA-F]{64}$/.test(explicit)) return Buffer.from(explicit, "hex")
    const buf = Buffer.from(explicit, "base64")
    if (buf.length === 32) return buf
    return createHash("sha256").update(explicit).digest()
  }
  return createHash("sha256").update(Buffer.from(getSessionSecret())).update("token-store/v1").digest()
}

export function encryptToken(plaintext: string): string {
  if (!plaintext) return ""
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, ct, tag]).toString("base64")
}

export function decryptToken(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (!stored.startsWith(PREFIX)) {
    console.warn("[TokenStore] Found non-encrypted token in database. Re-encrypting on read.")
    return stored
  }
  try {
    const payload = Buffer.from(stored.slice(PREFIX.length), "base64")
    if (payload.length <= IV_LEN + TAG_LEN) return null
    const iv = payload.subarray(0, IV_LEN)
    const tag = payload.subarray(payload.length - TAG_LEN)
    const ct = payload.subarray(IV_LEN, payload.length - TAG_LEN)
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv)
    decipher.setAuthTag(tag)
    const pt = Buffer.concat([decipher.update(ct), decipher.final()])
    return pt.toString("utf8")
  } catch (err) {
    console.error("[TokenStore] Failed to decrypt token:", err instanceof Error ? err.message : err)
    return null
  }
}

export function isMockToken(token: string | null | undefined): boolean {
  return !token || token === "mock-token"
}

export async function getUserAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessToken: true },
  })

  const stored = user?.accessToken ?? null
  if (stored && !stored.startsWith(PREFIX) && !isMockToken(stored)) {
    const encrypted = encryptToken(stored)
    await prisma.user.update({ where: { id: userId }, data: { accessToken: encrypted } }).catch((err) => {
      console.error("[TokenStore] Failed to re-encrypt token:", err instanceof Error ? err.message : err)
    })
    return stored
  }

  const decrypted = decryptToken(stored)
  if (!isMockToken(decrypted)) return decrypted
  return null
}
