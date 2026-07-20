import { z } from "zod"
import type { ComponentType } from "react"
import {
  BanIcon,
  Building2Icon,
  GraduationCapIcon,
  HeadsetIcon,
  HomeIcon,
  PalmtreeIcon,
  PauseCircleIcon,
  UserRoundXIcon,
  VideoIcon,
} from "lucide-react"

import type { SessionRole } from "@/lib/session"

export const presenceStatusSchema = z.enum(["ONLINE", "BUSY", "AWAY", "OFFLINE"])
export type PresenceStatus = z.infer<typeof presenceStatusSchema>

export const workActivityStatusSchema = z.enum([
  "ONSITE",
  "HOME_OFFICE",
  "IN_MEETING",
  "IN_SERVICE",
  "ON_BREAK",
  "IN_TRAINING",
  "ON_VACATION",
  "ON_LEAVE",
  "UNAVAILABLE",
])
export type WorkActivityStatus = z.infer<typeof workActivityStatusSchema>

export const statusMessageSchema = z
  .string()
  .trim()
  .max(200, "O recado pode ter no máximo 200 caracteres")

/** Full profile record — only the fields in `EditableProfileFields` may ever be written by the owner. */
export interface UserProfile {
  id: string
  name: string
  email: string
  sector: string
  phone: string
  cpf: string
  role: SessionRole
  avatarUrl: string | null
  presenceStatus: PresenceStatus
  workActivityStatus: WorkActivityStatus
  statusMessage: string
  lastSeenAt: string
  profileUpdatedAt: string
}

export type EditableProfileFields = Pick<
  UserProfile,
  "avatarUrl" | "presenceStatus" | "workActivityStatus" | "statusMessage"
>

/**
 * Subset safe to show to OTHER users (e.g. a future chat contact card).
 * Deliberately excludes email/phone/cpf/role.
 */
export interface PublicProfile {
  id: string
  name: string
  sector: string
  avatarUrl: string | null
  presenceStatus: PresenceStatus
  workActivityStatus: WorkActivityStatus
  statusMessage: string
  lastSeenAt: string
}

export function toPublicProfile(profile: UserProfile): PublicProfile {
  return {
    id: profile.id,
    name: profile.name,
    sector: profile.sector,
    avatarUrl: profile.avatarUrl,
    presenceStatus: profile.presenceStatus,
    workActivityStatus: profile.workActivityStatus,
    statusMessage: profile.statusMessage,
    lastSeenAt: profile.lastSeenAt,
  }
}

export const presenceItems: {
  label: string
  value: PresenceStatus
  dotClassName: string
}[] = [
  { label: "Online", value: "ONLINE", dotClassName: "bg-green-500 dark:bg-green-400" },
  { label: "Ocupado", value: "BUSY", dotClassName: "bg-red-500 dark:bg-red-400" },
  { label: "Ausente", value: "AWAY", dotClassName: "bg-yellow-500 dark:bg-yellow-400" },
  { label: "Offline", value: "OFFLINE", dotClassName: "bg-muted-foreground/40" },
]

export const workActivityItems: {
  label: string
  value: WorkActivityStatus
  icon: ComponentType<{ className?: string }>
}[] = [
  { label: "Trabalhando presencialmente", value: "ONSITE", icon: Building2Icon },
  { label: "Trabalhando em home office", value: "HOME_OFFICE", icon: HomeIcon },
  { label: "Em reunião", value: "IN_MEETING", icon: VideoIcon },
  { label: "Em atendimento", value: "IN_SERVICE", icon: HeadsetIcon },
  { label: "Em intervalo", value: "ON_BREAK", icon: PauseCircleIcon },
  { label: "Em treinamento", value: "IN_TRAINING", icon: GraduationCapIcon },
  { label: "De férias", value: "ON_VACATION", icon: PalmtreeIcon },
  { label: "Afastado", value: "ON_LEAVE", icon: UserRoundXIcon },
  { label: "Indisponível", value: "UNAVAILABLE", icon: BanIcon },
]
