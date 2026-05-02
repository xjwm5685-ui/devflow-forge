import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createHmac, timingSafeEqual } from "crypto"
import { z } from "zod"

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex")
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(sigBuf, expectedBuf)
}

const pushPayloadSchema = z.object({
  ref: z.string(),
  repository: z.object({
    full_name: z.string(),
  }),
  commits: z.array(z.object({
    message: z.string(),
    id: z.string(),
  })).optional().default([]),
})

const pullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    number: z.number(),
  }).optional(),
  repository: z.object({
    full_name: z.string(),
  }),
})

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get("x-hub-signature-256") ?? ""
  const event = request.headers.get("x-github-event") ?? "unknown"

  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch (err) {
    console.warn("[Webhook] Invalid JSON payload:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  switch (event) {
    case "push": {
      const parsed = pushPayloadSchema.safeParse(payload)
      if (!parsed.success) {
        console.warn("[Webhook] Invalid push payload:", parsed.error.message)
        return NextResponse.json({ error: "Invalid push payload" }, { status: 400 })
      }
      const data = parsed.data
      const repo = data.repository.full_name
      const branch = data.ref.replace("refs/heads/", "")
      const commits = data.commits

      const project = await prisma.project.findFirst({
        where: { githubRepo: repo },
        include: {
          workflows: { where: { isTemplate: false } },
        },
      })

      if (project && project.githubBranch === branch) {
        for (const workflow of project.workflows) {
          const def = JSON.parse(workflow.definition)
          const hasTrigger = def.nodes?.some(
            (n: { data?: { type?: string } }) => n.data?.type === "trigger"
          )

          if (hasTrigger) {
            const task = await prisma.task.create({
              data: {
                projectId: project.id,
                workflowId: workflow.id,
                userId: project.userId,
                type: "FULL_PIPELINE",
                status: "PENDING",
                input: JSON.stringify({
                  trigger: "push",
                  branch,
                  commits: commits.map((c) => ({
                    message: c.message,
                    sha: c.id.slice(0, 7),
                  })),
                }),
              },
            })

            const { processWorkflowTask } = await import("@/lib/queue/workers/agent-worker")
            processWorkflowTask(task.id, workflow).catch(console.error)
          }
        }
      }

      return NextResponse.json({ processed: true, event: "push", repo, branch })
    }

    case "pull_request": {
      const parsed = pullRequestPayloadSchema.safeParse(payload)
      if (!parsed.success) {
        console.warn("[Webhook] Invalid pull_request payload:", parsed.error.message)
        return NextResponse.json({ error: "Invalid pull_request payload" }, { status: 400 })
      }
      const data = parsed.data
      const action = data.action
      const repo = data.repository.full_name

      if (action === "opened" || action === "synchronize") {
        const project = await prisma.project.findFirst({
          where: { githubRepo: repo },
        })

        if (project) {
          return NextResponse.json({
            processed: true,
            event: "pull_request",
            action,
            pr: data.pull_request?.number,
          })
        }
      }

      return NextResponse.json({ processed: true, event: "pull_request", action })
    }

    case "ping": {
      return NextResponse.json({ message: "pong" })
    }

    default: {
      return NextResponse.json({ processed: true, event, skipped: true })
    }
  }
}
