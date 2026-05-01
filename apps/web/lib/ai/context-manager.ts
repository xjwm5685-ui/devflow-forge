import type { ContextResult, AgentMessage } from "@devflow/shared"

interface FileEntry {
  path: string
  content: string
}

interface ContextConfig {
  maxTokens: number
  reservedForOutput: number
}

const DEFAULT_CONFIG: ContextConfig = {
  maxTokens: 100_000,
  reservedForOutput: 4_000,
}

export class ContextManager {
  private config: ContextConfig

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async buildContext(params: {
    files: FileEntry[]
    task: string
    conversationHistory?: AgentMessage[]
    additionalInstructions?: string
  }): Promise<ContextResult> {
    const { files, task, additionalInstructions } = params
    const budget = this.config.maxTokens - this.config.reservedForOutput

    // Score files by relevance
    const scoredFiles = this.scoreFiles(files, task)

    // Sort by score descending
    scoredFiles.sort((a, b) => b.score - a.score)

    // Compress to fit budget
    const { included, omitted, totalTokens } = this.compressToFit(scoredFiles, budget)

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(included, task, additionalInstructions)

    return {
      systemPrompt,
      files: included,
      totalTokens,
      compressed: omitted.length > 0,
      omittedFiles: omitted.map((f) => ({
        path: f.path,
        reason: `Low relevance score (${f.score.toFixed(2)}) - omitted to fit context budget`,
      })),
    }
  }

  private scoreFiles(files: FileEntry[], task: string): Array<FileEntry & { score: number }> {
    const taskWords = this.extractKeywords(task)

    return files.map((file) => {
      let score = 0.5 // Base score

      // Boost for file type relevance
      if (file.path.endsWith(".ts") || file.path.endsWith(".tsx")) score += 0.1
      if (file.path.endsWith(".json") && file.path.includes("package")) score += 0.05
      if (file.path.includes("test") || file.path.includes("spec")) score -= 0.1
      if (file.path.includes("node_modules") || file.path.includes(".next")) score -= 0.5

      // Boost for keyword matches in path
      for (const word of taskWords) {
        if (file.path.toLowerCase().includes(word.toLowerCase())) {
          score += 0.2
        }
      }

      // Boost for keyword matches in content
      const contentLower = file.content.toLowerCase()
      for (const word of taskWords) {
        const matches = contentLower.split(word.toLowerCase()).length - 1
        score += Math.min(matches * 0.05, 0.3)
      }

      // Penalize very large files
      const tokens = this.estimateTokens(file.content)
      if (tokens > 5000) score -= 0.1
      if (tokens > 10000) score -= 0.2

      // Boost smaller, focused files
      if (tokens < 500) score += 0.05

      return { ...file, score: Math.max(0, Math.min(1, score)) }
    })
  }

  private compressToFit(
    scoredFiles: Array<FileEntry & { score: number }>,
    budget: number
  ) {
    const included: Array<{ path: string; content: string; score: number }> = []
    const omitted: Array<{ path: string; score: number }> = []
    let totalTokens = 0

    for (const file of scoredFiles) {
      const fileTokens = this.estimateTokens(file.content)

      if (totalTokens + fileTokens <= budget) {
        included.push({ path: file.path, content: file.content, score: file.score })
        totalTokens += fileTokens
      } else {
        // Try truncating large files
        if (fileTokens > 1000 && file.score > 0.6) {
          const remainingBudget = budget - totalTokens
          if (remainingBudget > 200) {
            const truncated = this.truncateToTokenLimit(file.content, remainingBudget)
            included.push({ path: file.path, content: truncated + "\n// ... [truncated]", score: file.score })
            totalTokens += this.estimateTokens(truncated)
            continue
          }
        }
        omitted.push({ path: file.path, score: file.score })
      }
    }

    return { included, omitted, totalTokens }
  }

  private buildSystemPrompt(
    files: Array<{ path: string; content: string }>,
    task: string,
    additionalInstructions?: string
  ): string {
    const fileSections = files.map((f) => {
      return `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``
    }).join("\n\n")

    return `You are an expert software engineer working on a codebase.

## Task
${task}

${additionalInstructions ? `## Additional Instructions\n${additionalInstructions}\n` : ""}

## Codebase Context
The following files are provided for context. Analyze them carefully before proceeding.

${fileSections}

## Guidelines
- Provide specific, actionable responses
- Reference file paths when discussing code
- Consider the existing patterns and conventions in the codebase
- When making changes, explain the reasoning behind each decision`
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
      "may", "might", "shall", "can", "to", "of", "in", "for", "on", "with", "at",
      "by", "from", "as", "into", "through", "during", "before", "after", "above",
      "below", "between", "out", "off", "over", "under", "again", "further", "then",
      "once", "and", "but", "or", "nor", "not", "so", "very", "just", "about"])

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4
    if (text.length <= maxChars) return text

    // Try to truncate at a line boundary
    const truncated = text.slice(0, maxChars)
    const lastNewline = truncated.lastIndexOf("\n")
    return lastNewline > maxChars * 0.8 ? truncated.slice(0, lastNewline) : truncated
  }
}
