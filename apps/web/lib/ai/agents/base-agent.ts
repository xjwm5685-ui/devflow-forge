import type { AgentName, AgentMessage, AgentResult, ContextResult } from "@devflow/shared"
import { messageBus, createAgentMessage } from "./message-bus"
import { tokenMeter } from "../token-meter"
import { callLLM, buildMessages, isLLMConfigured, type ChatMessage } from "../client"

export interface AgentParams {
  taskId: string
  userId: string
  input: string
  context: ContextResult
  conversationHistory?: AgentMessage[]
}

export abstract class BaseAgent {
  protected name: AgentName
  protected model: string

  constructor(name: AgentName, model?: string) {
    this.name = name
    this.model = model ?? process.env.OPENAI_MODEL ?? "gpt-4o"
  }

  abstract getSystemPrompt(): string
  abstract getDemoResponse(params: AgentParams): string

  async execute(params: AgentParams): Promise<AgentResult> {
    const { taskId, userId, input, context, conversationHistory = [] } = params

    // Announce agent is starting
    await messageBus.publish(taskId, createAgentMessage(
      taskId, this.name, "orchestrator", "status",
      `${this.name} agent is analyzing the task...`
    ))

    // Decide: real LLM or demo mode
    const useRealLLM = isLLMConfigured() && process.env.DEMO_MODE !== "true"

    let content: string
    let tokenUsage = { input: 0, output: 0 }

    if (useRealLLM) {
      try {
        const result = await this.callRealLLM(input, context, conversationHistory)
        content = result.content
        tokenUsage = result.tokenUsage
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error"
        await messageBus.publish(taskId, createAgentMessage(
          taskId, this.name, "orchestrator", "error",
          `LLM call failed: ${errMsg}. Falling back to demo mode.`
        ))
        // Fallback to demo
        await this.simulateDelay()
        content = this.getDemoResponse(params)
        tokenUsage = {
          input: Math.floor(Math.random() * 5000) + 2000,
          output: Math.floor(Math.random() * 3000) + 1000,
        }
      }
    } else {
      // Demo mode
      await this.simulateDelay()
      content = this.getDemoResponse(params)
      tokenUsage = {
        input: Math.floor(Math.random() * 5000) + 2000,
        output: Math.floor(Math.random() * 3000) + 1000,
      }
    }

    // Record token usage
    await tokenMeter.record({
      userId,
      model: this.model,
      inputTokens: tokenUsage.input,
      outputTokens: tokenUsage.output,
      taskId,
    })

    // Send response through message bus
    await messageBus.publish(taskId, createAgentMessage(
      taskId, this.name, "orchestrator", "response",
      content,
      { tokenUsage, timestamp: Date.now() }
    ))

    return {
      success: true,
      content,
      tokenUsage,
      artifacts: this.extractArtifacts(content),
    }
  }

  protected async callRealLLM(
    input: string,
    context: ContextResult,
    history: AgentMessage[]
  ): Promise<{ content: string; tokenUsage: { input: number; output: number } }> {
    // Convert agent history to chat messages
    const chatHistory: ChatMessage[] = history
      .filter((m) => m.type === "response" || m.type === "request")
      .slice(-10) // Keep last 10 messages for context
      .map((m) => ({
        role: m.type === "response" ? "assistant" as const : "user" as const,
        content: `[${m.from}]: ${m.content}`,
      }))

    const messages = buildMessages(
      context.systemPrompt + "\n\n" + this.getSystemPrompt(),
      input,
      chatHistory
    )

    const response = await callLLM(messages, {
      model: this.model,
      maxTokens: 4096,
      temperature: 0.7,
    })

    return {
      content: response.content,
      tokenUsage: {
        input: response.usage.promptTokens,
        output: response.usage.completionTokens,
      },
    }
  }

  protected extractArtifacts(content: string): AgentResult["artifacts"] {
    const artifacts: AgentResult["artifacts"] = []

    // Extract code blocks with filenames
    const codeBlockRegex = /```(\w+)?\s*(?:filename[=:]?\s*(\S+))?\n([\s\S]*?)```/g
    let match
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const filename = match[2]
      const code = match[3]
      if (filename && code) {
        artifacts.push({
          type: "file_change",
          name: filename,
          content: code.trim(),
        })
      }
    }

    return artifacts.length > 0 ? artifacts : undefined
  }

  protected async simulateDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 2000) + 1500
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}
