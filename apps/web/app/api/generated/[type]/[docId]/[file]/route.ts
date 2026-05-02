import { stat } from "fs/promises"
import { createReadStream } from "fs"
import { Readable } from "stream"
import path from "path"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db"

const ALLOWED_TYPES = new Set(["audio", "video"])

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".html": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
}

function getStorageRoot(): string {
  return path.resolve(process.cwd(), "storage")
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; docId: string; file: string }> }
) {
  const session = await getSession()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const { type, docId, file } = await params

  if (!ALLOWED_TYPES.has(type)) return new Response("Not found", { status: 404 })
  if (!/^[A-Za-z0-9_-]+$/.test(docId)) return new Response("Not found", { status: 404 })
  if (!/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..")) return new Response("Not found", { status: 404 })

  const document = await prisma.document.findFirst({
    where: { id: docId, userId: session.id },
    select: { id: true },
  })
  if (!document) return new Response("Not found", { status: 404 })

  const storageRoot = getStorageRoot()
  const subdir = path.resolve(storageRoot, type, docId)
  const target = path.resolve(subdir, file)

  // Defense-in-depth path traversal check.
  const expectedPrefix = path.resolve(storageRoot, type) + path.sep
  if (!target.startsWith(expectedPrefix)) return new Response("Not found", { status: 404 })

  const fileStat = await stat(target).catch(() => null)
  if (!fileStat?.isFile()) return new Response("Not found", { status: 404 })

  const ext = path.extname(target).toLowerCase()
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream"

  return new Response(Readable.toWeb(createReadStream(target)) as unknown as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Cache-Control": "private, max-age=3600",
    },
  })
}
