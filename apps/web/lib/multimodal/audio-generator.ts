import { getLLMConfig } from "@/lib/ai/client"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

interface AudioResult {
  success: boolean
  filePath?: string
  duration?: number
  error?: string
}

export async function generateNarration(params: {
  text: string
  voice?: string
  outputDir?: string
}): Promise<AudioResult> {
  const { text, voice = "alloy", outputDir } = params
  const config = getLLMConfig()

  if (!config.apiKey) {
    return { success: false, error: "No API key configured" }
  }

  try {
    // Call OpenAI-compatible TTS API
    const response = await fetch(`${config.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text.slice(0, 4096), // TTS API limit
        voice,
        response_format: "mp3",
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `TTS API error: ${error}` }
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    // Save to file if outputDir specified
    if (outputDir) {
      await mkdir(outputDir, { recursive: true })
      const filename = `narration-${Date.now()}.mp3`
      const filePath = join(outputDir, filename)
      await writeFile(filePath, buffer)
      return { success: true, filePath, duration: estimateDuration(text) }
    }

    return { success: true, duration: estimateDuration(text) }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "TTS generation failed",
    }
  }
}

function estimateDuration(text: string): number {
  // Average speaking rate: ~150 words per minute
  const words = text.split(/\s+/).length
  return Math.ceil((words / 150) * 60)
}

export function chunkText(text: string, maxChars: number = 4000): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ""

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxChars && current) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current = current ? current + " " + sentence : sentence
    }
  }

  if (current) chunks.push(current.trim())
  return chunks
}
