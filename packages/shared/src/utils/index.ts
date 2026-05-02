export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ""
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ""
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return ""
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ""
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ""
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export function truncate(str: string, maxLength: number): string {
  if (maxLength < 4) return str.slice(0, maxLength)
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

export function formatTokenCount(count: number | string | null | undefined): string {
  if (count == null) return "0"
  const n = typeof count === "string" ? parseFloat(count) : count
  if (isNaN(n)) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateId(): string {
  return crypto.randomUUID()
}
