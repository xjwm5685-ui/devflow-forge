import type { AgentName } from "@devflow/shared"
import { BaseAgent, type AgentParams } from "./base-agent"
import type { CustomAgent } from "../custom-agents"
import { toAgentName } from "../custom-agents"

export class CustomPromptAgent extends BaseAgent {
  private agent: CustomAgent

  constructor(agent: CustomAgent) {
    super(toAgentName(agent.id) as AgentName, agent.model || undefined)
    this.agent = agent
  }

  getSystemPrompt(): string {
    return `You are ${this.agent.name}, a custom DevFlow Forge agent.

Role: ${this.agent.role}
Description: ${this.agent.description || "No description provided."}

Custom instructions:
${this.agent.systemPrompt}`
  }

  getDemoResponse(params: AgentParams): string {
    return `## ${this.agent.name}

Custom agent demo response.

### Role
${this.agent.role}

### Task
${params.input}

### Next Step
Switch Settings to API or CLI mode to execute this custom agent with a real model or local AI coding CLI.`
  }
}
