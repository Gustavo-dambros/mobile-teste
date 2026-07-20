import type { Announcement, NotificationKind } from "@/components/announcements/types"

export function notificationMessage(kind: NotificationKind, announcement: Announcement): string {
  const label = announcement.type === "Evento" ? "evento" : "anúncio"
  switch (kind) {
    case "published":
      return `Novo ${label} publicado: "${announcement.title}"`
    case "updated":
      return `O ${label} "${announcement.title}" foi atualizado`
    case "reminder-1d":
      return `Lembrete: "${announcement.title}" acontece amanhã às ${announcement.time}`
    case "reminder-day-of":
      return `Hoje é o dia: "${announcement.title}" às ${announcement.time}`
  }
}

export function notificationHeadline(kind: NotificationKind): string {
  switch (kind) {
    case "published":
      return "Nova publicação"
    case "updated":
      return "Publicação atualizada"
    case "reminder-1d":
      return "Lembrete — amanhã"
    case "reminder-day-of":
      return "Lembrete — hoje"
  }
}
