import type { AgentName, AgentMessage, WorkflowDefinition } from "@devflow/shared"
import { messageBus, createAgentMessage } from "./message-bus"
import { ContextManager } from "../context-manager"
import { architectAgent } from "./architect-agent"
import { coderAgent } from "./coder-agent"
import { qaAgent } from "./qa-agent"
import { devopsAgent } from "./devops-agent"
import type { BaseAgent } from "./base-agent"
import { prisma } from "@/lib/db"
import { MAX_AGENT_RETRIES } from "@devflow/shared"

const AGENTS: Record<AgentName, BaseAgent> = {
  architect: architectAgent,
  coder: coderAgent,
  qa: qaAgent,
  devops: devopsAgent,
}

interface ExecuteWorkflowParams {
  taskId: string
  userId: string
  workflow: WorkflowDefinition
  input: string
  files?: Array<{ path: string; content: string }>
}

export class Orchestrator {
  private contextManager: ContextManager

  constructor() {
    this.contextManager = new ContextManager()
  }

  async executeWorkflow(params: ExecuteWorkflowParams): Promise<void> {
    const { taskId, userId, workflow, input, files = [] } = params

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
      // Build context from files
      const context = await this.contextManager.buildContext({
        files,
        task: input,
      })

      // Execute agents in sequence from workflow definition
      const agentNodes = workflow.nodes
        .filter((n) => n.type === "agent")
        .sort((a, b) => a.position.y - b.position.y)

      let currentInput = input
      let qaPassCount = 0

      for (const node of agentNodes) {
        const agentName = node.data.agentName as AgentName
        const agent = AGENTS[agentName]

        if (!agent) {
          throw new Error(`Unknown agent: ${agentName}`)
        }

        // Announce agent start
        await messageBus.publish(taskId, createAgentMessage(
          taskId, "architect", "orchestrator", "status",
          `Starting ${node.data.label || agentName} agent...`
        ))

        // Execute agent with retry logic for QA
        let result
        let retries = 0

        while (retries < MAX_AGENT_RETRIES) {
          result = await agent.execute({
            taskId,
            userId,
            input: currentInput,
            context,
            conversationHistory: messageBus.getHistory(taskId),
          })

          // Result captured for potential feedback loop
          void result.content

          // QA agent can trigger re-execution of coder
          if (agentName === "qa") {
            const needsChanges = result.content.toLowerCase().includes("needs_changes") ||
                                 result.content.toLowerCase().includes("fail")

            if (needsChanges && retries < MAX_AGENT_RETRIES - 1) {
              retries++
              qaPassCount++

              await messageBus.publish(taskId, createAgentMessage(
                taskId, "qa", "orchestrator", "status",
                `QA found issues. Sending back to Coder (attempt ${retries}/${MAX_AGENT_RETRIES})...`
              ))

              // Re-execute coder with QA feedback
              const coderResult = await coderAgent.execute({
                taskId,
                userId,
                input: `Based on QA feedback, fix the issues:\n\n${result.content}\n\nOriginal task: ${currentInput}`,
                context,
                conversationHistory: messageBus.getHistory(taskId),
              })

              currentInput = coderResult.content
              continue
            }
          }

          break
        }

        // Prepare input for next agent
        if (agentName !== "qa") {
          currentInput = `Previous agent (${agentName}) output:\n\n${result!.content}\n\nOriginal task: ${input}`
        }
      }

      // Generate PR description
      const prDescription = this.generatePRDescription(input, messageBus.getHistory(taskId))

      // Update task as completed
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          output: JSON.stringify({
            summary: "Workflow completed successfully",
            prDescription,
            agentsExecuted: agentNodes.map((n) => n.data.agentName),
            qaIterations: qaPassCount,
          }),
          agentTrace: JSON.stringify(messageBus.getHistory(taskId)),
        },
      })

      await messageBus.publish(taskId, createAgentMessage(
        taskId, "architect", "orchestrator", "response",
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
