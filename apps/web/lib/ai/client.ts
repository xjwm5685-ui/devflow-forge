// OpenAI-compatible LLM client
// Works with any provider: OpenAI, MiMo, DeepSeek, local models, etc.

import { loadSettings } from "@/lib/settings"

export interface LLMConfig {
  apiKey: string
  baseUrl: string
  model: string
  maxTokens?: number
  temperature?: number
}

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LLMResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  finishReason: string
}

export interface LLMStreamChunk {
  content: string
  done: boolean
}

const DEFAULT_CONFIG: Partial<LLMConfig> = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o",
  maxTokens: 4096,
  temperature: 0.7,
}

export function getLLMConfig(overrides?: Partial<LLMConfig>): LLMConfig {
  return {
    apiKey: overrides?.apiKey ?? process.env.OPENAI_API_KEY ?? "",
    baseUrl: overrides?.baseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_CONFIG.baseUrl!,
    model: overrides?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_CONFIG.model!,
    maxTokens: overrides?.maxTokens ?? DEFAULT_CONFIG.maxTokens,
    temperature: overrides?.temperature ?? DEFAULT_CONFIG.temperature,
  }
}

export function getLLMConfigFromSettings(overrides?: Partial<LLMConfig>): LLMConfig {
  try {
    const settings = loadSettings()
    return {
      apiKey: overrides?.apiKey ?? settings.openaiApiKey ?? process.env.OPENAI_API_KEY ?? "",
      baseUrl: overrides?.baseUrl ?? settings.openaiBaseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_CONFIG.baseUrl!,
      model: overrides?.model ?? settings.openaiModel ?? process.env.OPENAI_MODEL ?? DEFAULT_CONFIG.model!,
      maxTokens: overrides?.maxTokens ?? DEFAULT_CONFIG.maxTokens,
      temperature: overrides?.temperature ?? DEFAULT_CONFIG.temperature,
    }
  } catch {
    return getLLMConfig(overrides)
  }
}

function isLocalBaseUrl(baseUrl: string | undefined): boolean {
  if (!baseUrl) return false
  try {
    const url = new URL(baseUrl)
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1"
  } catch {
    return false
  }
}

export async function isLLMConfigured(): Promise<boolean> {
  const envKey = process.env.OPENAI_API_KEY
  if (envKey && envKey.length > 0) return true

  try {
    const { loadSettings } = await import("@/lib/settings")
    const settings = loadSettings()
    if (settings.openaiApiKey && settings.openaiApiKey.length > 0) return true
  } catch {
    // Settings not available yet
  }

  return isLocalBaseUrl(process.env.OPENAI_BASE_URL)
}

export async function callLLM(
  messages: ChatMessage[],
  config?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const cfg = getLLMConfig(config)

  if (!cfg.apiKey && !isLocalBaseUrl(cfg.baseUrl)) {
    throw new Error("OPENAI_API_KEY is not configured. Set it in .env.local or in the Settings page.")
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (cfg.apiKey) {
    headers.Authorization = `Bearer ${cfg.apiKey}`
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: cfg.model,
      messages,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LLM API error (${response.status}): ${error}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    model?: string
  }
  const choice = data.choices?.[0]

  if (!choice) {
    throw new Error("No response from LLM API")
  }

  return {
    content: choice.message?.content ?? "",
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
    model: data.model ?? cfg.model,
    finishReason: choice.finish_reason ?? "stop",
  }
}

// Streaming version for real-time agent output
export async function* callLLMStream(
  messages: ChatMessage[],
  config?: Partial<LLMConfig>
): AsyncGenerator<LLMStreamChunk> {
  const cfg = getLLMConfig(config)

  if (!cfg.apiKey && !isLocalBaseUrl(cfg.baseUrl)) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (cfg.apiKey) {
    headers.Authorization = `Bearer ${cfg.apiKey}`
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: cfg.model,
      messages,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === "data: [DONE]") continue
        if (!trimmed.startsWith("data: ")) continue

        try {
          const data = JSON.parse(trimmed.slice(6))
          const content = data.choices?.[0]?.delta?.content ?? ""
          const isDone = data.choices?.[0]?.finish_reason != null
          yield { content, done: isDone }
        } catch (err) {
          console.warn("[AiClient] Skipping malformed SSE chunk:", err)
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

// Utility: build system + user message pair
export function buildMessages(
  systemPrompt: string,
  userMessage: string,
  history?: ChatMessage[]
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }]

  if (history) {
    messages.push(...history)
  }

  messages.push({ role: "user", content: userMessage })
  return messages
}
