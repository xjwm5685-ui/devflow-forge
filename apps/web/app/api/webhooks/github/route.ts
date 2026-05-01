import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createHmac, timingSafeEqual } from "crypto"

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex")
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(sigBuf, expectedBuf)
}

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

  const payload = JSON.parse(body)

  switch (event) {
    case "push": {
      const repo = payload.repository?.full_name as string
      const branch = (payload.ref as string)?.replace("refs/heads/", "")
      const commits = payload.commits ?? []

      // Find project matching this repo
      const project = await prisma.project.findFirst({
        where: { githubRepo: repo },
        include: {
          workflows: { where: { isTemplate: false } },
        },
      })

      if (project && project.githubBranch === branch) {
        // Auto-trigger workflows configured for push events
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
                  commits: commits.map((c: { message: string; id: string }) => ({
                    message: c.message,
                    sha: c.id.slice(0, 7),
                  })),
                }),
              },
            })

            // Trigger workflow execution
            const { processWorkflowTask } = await import("@/lib/queue/workers/agent-worker")
            processWorkflowTask(task.id, workflow).catch(console.error)
          }
        }
      }

      return NextResponse.json({ processed: true, event: "push", repo, branch })
    }

    case "pull_request": {
      const action = payload.action as string
      const pr = payload.pull_request
      const repo = payload.repository?.full_name as string

      if (action === "opened" || action === "synchronize") {
        const project = await prisma.project.findFirst({
          where: { githubRepo: repo },
        })

        if (project) {
          // Could trigger a code review workflow here
          return NextResponse.json({
            processed: true,
            event: "pull_request",
            action,
            pr: pr?.number,
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
