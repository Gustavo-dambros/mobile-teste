export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR")
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} às ${formatTime(iso)}`
}

/** "2h 15min", "45min" or "1d 3h" — used for SLA/first-response timers. */
export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isWithinEditWindow(iso: string, minutes = 15) {
  const elapsedMs = Date.now() - new Date(iso).getTime()
  return elapsedMs <= minutes * 60 * 1000
}

export function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

/** WhatsApp-style day separator label: "Hoje", "Ontem" or a full date. */
export function formatDaySeparator(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, today)) return "Hoje"
  if (isSameDay(date, yesterday)) return "Ontem"
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}
