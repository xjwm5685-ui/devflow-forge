import type { AgentName, AgentMessage, BuiltInAgentName, WorkflowDefinition } from "@devflow/shared"
import { messageBus, createAgentMessage } from "./message-bus"
import { ContextManager } from "../context-manager"
import { architectAgent } from "./architect-agent"
import { coderAgent } from "./coder-agent"
import { qaAgent } from "./qa-agent"
import { devopsAgent } from "./devops-agent"
import type { BaseAgent } from "./base-agent"
import { prisma } from "@/lib/db"
import { MAX_AGENT_RETRIES } from "@devflow/shared"
import { CustomPromptAgent } from "./custom-agent"
import { fromAgentName, getCustomAgent } from "../custom-agents"

const AGENTS: Record<BuiltInAgentName, BaseAgent> = {
  architect: architectAgent,
  coder: coderAgent,
  qa: qaAgent,
  devops: devopsAgent,
}

function isBuiltInAgentName(value: string): value is BuiltInAgentName {
  return value === "architect" || value === "coder" || value === "qa" || value === "devops"
}

interface ExecuteWorkflowParams {
  taskId: string
  userId: string
  workflow: WorkflowDefinition
  input: string
  files?: Array<{ path: string; content: string }>
  /** Optional absolute path that CLI agents may use as cwd. */
  cliWorkspace?: string
}

export class Orchestrator {
  private contextManager: ContextManager

  constructor() {
    this.contextManager = new ContextManager()
  }

  async executeWorkflow(params: ExecuteWorkflowParams): Promise<void> {
    const { taskId, userId, workflow, input, files = [], cliWorkspace } = params

    // Update task status to RUNNING
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "RUNNING", startedAt: new Date() },
    })

    // Announce workflow start
    await messageBus.publish(taskId, createAgentMessage(
      taskId, "architect", "orchestrator", "status",
      "Workflow execution started. Analyzing task requirements..."
    ))

    try {
      const context = await this.contextManager.buildContext({
        files,
        task: input,
      })

      await messageBus.loadHistory(taskId)

      const { orderedAgentNodes } = this.resolveExecutionOrder(workflow)

      let currentInput = input
      let qaPassCount = 0

      for (const node of orderedAgentNodes) {
        if (node.data.type === "deploy") {
          await messageBus.publish(taskId, createAgentMessage(
            taskId, "devops", "orchestrator", "status",
            "Deployment node reached. Generating deployment configuration..."
          ))

          const devopsResult = await devopsAgent.execute({
            taskId,
            userId,
            input: `Deploy the project based on the work done.\n\n${currentInput}`,
            context,
            conversationHistory: messageBus.getHistory(taskId),
            cliWorkspace,
          })

          currentInput = `Deployment result:\n${devopsResult.content}\n\nOriginal task: ${input}`
          continue
        }

        const nodeData = node.data as { type: string; label: string; agentName?: string; prompt?: string; model?: string; maxIterations?: number; expression?: string }
        const agentName = (nodeData.agentName ?? "coder") as AgentName
        let agent: BaseAgent | undefined = isBuiltInAgentName(agentName) ? AGENTS[agentName] : undefined

        const customAgentId = fromAgentName(agentName)
        if (!agent && customAgentId) {
          const customAgent = getCustomAgent(userId, customAgentId)
          if (!customAgent) {
            throw new Error(`Custom agent not found: ${customAgentId}`)
          }
          agent = new CustomPromptAgent(customAgent)
        }

        if (!agent) {
          throw new Error(`Unknown agent: ${agentName}`)
        }

        await messageBus.publish(taskId, createAgentMessage(
          taskId, agentName, "orchestrator", "status",
          `Starting ${nodeData.label || agentName} agent...`
        ))

        let result
        let retries = 0

        while (retries < MAX_AGENT_RETRIES) {
          const nodePrompt = typeof nodeData.prompt === "string" && nodeData.prompt.trim()
            ? `Node instruction:\n${nodeData.prompt.trim()}\n\nWorkflow input:\n${currentInput}`
            : currentInput

          result = await agent.execute({
            taskId,
            userId,
            input: nodePrompt,
            context,
            conversationHistory: messageBus.getHistory(taskId),
            cliWorkspace,
          })

          if (agentName === "qa") {
            const needsChanges = result.content.toLowerCase().includes("needs_changes") ||
                                 result.content.toLowerCase().includes("fail")

            if (needsChanges) {
              qaPassCount++

              if (retries < MAX_AGENT_RETRIES - 1) {
                retries++

                await messageBus.publish(taskId, createAgentMessage(
                  taskId, "qa", "orchestrator", "status",
                  `QA found issues. Sending back to Coder (attempt ${retries}/${MAX_AGENT_RETRIES})...`
                ))

                const coderResult = await coderAgent.execute({
                  taskId,
                  userId,
                  input: `Based on QA feedback, fix the issues:\n\n${result.content}\n\nOriginal task: ${currentInput}`,
                  context,
                  conversationHistory: messageBus.getHistory(taskId),
                  cliWorkspace,
                })

                currentInput = coderResult.content
                continue
              }

              await messageBus.publish(taskId, createAgentMessage(
                taskId, "qa", "orchestrator", "status",
                `Max QA review attempts reached (${MAX_AGENT_RETRIES}). Proceeding - manual review recommended.`
              ))
            }
          }

          break
        }

        if (agentName !== "qa") {
          currentInput = `Previous agent (${agentName}) output:\n\n${result!.content}\n\nOriginal task: ${input}`
        }
      }

      // Generate PR description
      const prDescription = this.generatePRDescription(input, messageBus.getHistory(taskId))

      const executedAgentNodes = orderedAgentNodes.filter((n) => n.data.type === "agent")
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          output: JSON.stringify({
            summary: "Workflow completed successfully",
            prDescription,
            agentsExecuted: executedAgentNodes.map((n) => (n.data as { agentName?: string }).agentName),
            qaIterations: qaPassCount,
          }),
          agentTrace: JSON.stringify(messageBus.getHistory(taskId)),
        },
      })

      const lastAgentName = ((executedAgentNodes[executedAgentNodes.length - 1]?.data as { agentName?: string }).agentName as AgentName) ?? "architect"
      await messageBus.publish(taskId, createAgentMessage(
        taskId, lastAgentName, "orchestrator", "response",
        `✅ Workflow completed successfully!\n\n${prDescription}`
      ))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          output: JSON.stringify({ error: errorMessage }),
        },
      })

      await messageBus.publish(taskId, createAgentMessage(
        taskId, "architect", "orchestrator", "error",
        `❌ Workflow failed: ${errorMessage}`
      ))
    } finally {
      messageBus.clear(taskId)
    }
  }

  private resolveExecutionOrder(workflow: WorkflowDefinition): {
    orderedAgentNodes: Array<typeof workflow.nodes[number]>
    hasDeploy: boolean
  } {
    const { nodes, edges } = workflow
    if (!nodes || nodes.length === 0) {
      return { orderedAgentNodes: [], hasDeploy: false }
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    const outgoing = new Map<string, string[]>()
    for (const edge of edges) {
      const list = outgoing.get(edge.source) ?? []
      list.push(edge.target)
      outgoing.set(edge.source, list)
    }

    const entryNode = nodes.find((n) => {
      const t = (n.type ?? (n.data as Record<string, unknown>)?.type) as string
      return t === "trigger" || t === "start"
    }) ?? nodes[0]

    if (!entryNode) {
      return { orderedAgentNodes: [], hasDeploy: false }
    }

    const visited = new Set<string>()
    const order: Array<typeof nodes[number]> = []
    const queue: string[] = [entryNode.id]
    let hasDeploy = false

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const node = nodeMap.get(currentId)
      if (!node) continue

      const executableTypes = new Set(["agent", "deploy", "condition", "trigger"])
      const nt = (node.type ?? (node.data as Record<string, unknown>)?.type) as string
      if (executableTypes.has(nt)) {
        order.push(node)
        if (nt === "deploy") {
          hasDeploy = true
        }
      }

      const neighbors = outgoing.get(currentId)
      if (!neighbors || neighbors.length === 0) continue

      const nodeTypeStr = (node.type ?? (node.data as Record<string, unknown>)?.type) as string
      if (nodeTypeStr === "condition") {
        const expressionData = node.data as Record<string, unknown>
        const expression = String(expressionData.expression ?? "true").trim()
        const conditionResult = this.evaluateCondition(expression)

        if (conditionResult && neighbors.length > 0) {
          queue.push(neighbors[0]!)
        } else if (!conditionResult && neighbors.length > 1) {
          queue.push(neighbors[1]!)
        }
      } else {
        for (const nextId of neighbors) {
          if (!visited.has(nextId)) {
            queue.push(nextId)
          }
        }
      }
    }

    return { orderedAgentNodes: order, hasDeploy }
  }

  private evaluateCondition(expression: string): boolean {
    if (!expression || expression === "true") return true
    if (expression === "false") return false

    try {
      const safeEval = new Function("env", `"use strict"; return !!(${expression})`)
      return safeEval({ NODE_ENV: process.env.NODE_ENV })
    } catch {
      return true
    }
  }

  private generatePRDescription(originalTask: string, history: AgentMessage[]): string {
    const agentOutputs = history.filter((m) => m.type === "response")

    return `## Pull Request: AI-Generated Changes

### Task
${originalTask}

### Summary
This PR was generated by the DevFlow Forge multi-agent system.

### Agent Analysis
${agentOutputs.map((m) => `**${m.from}**: ${m.content.slice(0, 200)}...`).join("\n\n")}

### Changes
- Code refactored by Coder Agent
- Tests generated by QA Agent
- Deployment config by DevOps Agent

---
*Generated by DevFlow Forge AI*`
  }
}

export const orchestrator = new Orchestrator()
