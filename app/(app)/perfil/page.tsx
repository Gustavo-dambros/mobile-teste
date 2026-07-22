"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  PencilIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  UsersIcon,
  ShieldIcon,
  CrownIcon,
  ShieldCheckIcon,
  SunIcon,
  CameraIcon,
  BellIcon,
  LogOutIcon,
} from "lucide-react"

import { listContainer, listItem } from "@/lib/motion"
import { useProfile } from "@/lib/profile/store"
import { revokeAvatarUrl, uploadAvatarFile } from "@/lib/profile/upload"
import type { PresenceStatus, WorkActivityStatus } from "@/components/profile/types"
import { ACCEPTED_AVATAR_TYPES, validateAvatarFile } from "@/lib/profile/upload"
import { PresenceDot } from "@/components/profile/PresenceDot"
import { ThemeToggle } from "@/components/theme-toggle"
import { PresenceSection } from "@/components/profile/PresenceSection"
import { ReadOnlyInfoSection } from "@/components/profile/ReadOnlyInfoSection"
import { StatusMessageSection } from "@/components/profile/StatusMessageSection"
import { WorkActivitySection } from "@/components/profile/WorkActivitySection"
import { PresenceBadge, ActivityBadge } from "@/components/team/TeamBadges"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  sector: string
  role: string
  presence: string
  activity: string
  isSectorLeader: boolean
}

const presenceLabel: Record<PresenceStatus, string> = {
  ONLINE: "Online",
  BUSY: "Ocupado",
  AWAY: "Ausente",
  OFFLINE: "Offline",
}

export default function PerfilPage() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const { profile, updateProfile } = useProfile()

  const [editing, setEditing] = React.useState(false)
  const [avatarDraft, setAvatarDraft] = React.useState<string | null | undefined>(undefined)
  const [presenceDraft, setPresenceDraft] = React.useState<PresenceStatus>(profile.presenceStatus)
  const [activityDraft, setActivityDraft] = React.useState<WorkActivityStatus>(profile.workActivityStatus)
  const [messageDraft, setMessageDraft] = React.useState(profile.statusMessage)
  const [uploading, setUploading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = React.useState(true)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)

  const effectiveAvatarUrl = avatarDraft !== undefined ? avatarDraft : profile.avatarUrl

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const error = validateAvatarFile(file)
    if (error) {
      toast.error(error)
      return
    }

    handleFileSelected(file)
  }

  React.useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`/api/team/members`)
        if (res.ok) {
          const data = await res.json()
          setTeamMembers(data)
        }
      } catch {
        // silent
      } finally {
        setLoadingTeam(false)
      }
    }
    fetchTeam()
  }, [])

  async function handleFileSelected(file: File) {
    setUploading(true)
    try {
      const url = await uploadAvatarFile(file)
      if (avatarDraft) revokeAvatarUrl(avatarDraft)
      setAvatarDraft(url)
    } catch {
      toast.error("Não foi possível processar a imagem. Tente novamente.")
    } finally {
      setUploading(false)
    }
  }

  function handleCancel() {
    setEditing(false)
    setAvatarDraft(undefined)
    setPresenceDraft(profile.presenceStatus)
    setActivityDraft(profile.workActivityStatus)
    setMessageDraft(profile.statusMessage)
  }

  async function handleSave() {
    if (submitting) return
    setSubmitting(true)
    const result = await updateProfile({
      avatarUrl: effectiveAvatarUrl,
      presenceStatus: presenceDraft,
      workActivityStatus: activityDraft,
      statusMessage: messageDraft,
    })
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar as alterações.")
      return
    }
    toast.success("Perfil atualizado com sucesso.")
    setEditing(false)
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-15 items-center gap-3 border-b border-border px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 text-base font-semibold">Meu Perfil</h1>
        {editing ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="h-8 w-8"
            >
              <XIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={submitting || uploading}
              className="h-8 w-8"
            >
              {submitting ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckIcon className="h-4 w-4 text-primary" />
              )}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            className="h-8 w-8"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto pb-24">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            {effectiveAvatarUrl ? (
              <img
                src={effectiveAvatarUrl}
                alt={profile.name}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-3xl font-semibold text-muted-foreground">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            {editing && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={submitting || uploading}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <CameraIcon className="h-4 w-4" />
                )}
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept={ACCEPTED_AVATAR_TYPES}
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{profile.name}</h2>
              {editing && <ThemeToggle />}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <PresenceDot status={presenceDraft} />
              {presenceLabel[presenceDraft]}
            </div>
          </div>
        </div>

        <Separator />

        {editing ? (
          <motion.div
            variants={listContainer(reduced)}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5 p-4"
          >
            <motion.div variants={listItem(reduced)}>
              <ReadOnlyInfoSection profile={profile} />
            </motion.div>

            <Separator />

            <motion.div variants={listItem(reduced)}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 py-2">
                  <UsersIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Setor</p>
                    <p className="text-sm text-muted-foreground">{profile.sector}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <ShieldIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cargo</p>
                    <p className="text-sm text-muted-foreground">{profile.role === "ADMIN" ? "Administrador" : "Usuário"}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <Separator />

            <motion.div variants={listItem(reduced)}>
              <PresenceSection value={presenceDraft} onValueChange={setPresenceDraft} disabled={submitting} />
            </motion.div>

            <motion.div variants={listItem(reduced)}>
              <WorkActivitySection value={activityDraft} onValueChange={setActivityDraft} disabled={submitting} />
            </motion.div>

            <motion.div variants={listItem(reduced)}>
              <StatusMessageSection value={messageDraft} onValueChange={setMessageDraft} disabled={submitting} />
            </motion.div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-1 p-4">
            <ReadOnlyInfoSection profile={profile} />
            <Separator className="my-4" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 py-2">
                <UsersIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Setor</p>
                  <p className="text-sm text-muted-foreground">{profile.sector}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2">
                <ShieldIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Cargo</p>
                  <p className="text-sm text-muted-foreground">{profile.role === "ADMIN" ? "Administrador" : "Usuário"}</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Equipe do Setor</p>
              </div>
              {loadingTeam ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum membro encontrado</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {teamMembers.map((member) => (
                    <Drawer key={member.id} swipeDirection="down">
                      <DrawerTrigger
                        render={
                          <button className="flex items-center gap-3 rounded-lg py-2 px-1 text-left hover:bg-muted transition-colors" />
                        }
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{member.name}</span>
                            {member.isSectorLeader && (
                              <CrownIcon className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            )}
                          </div>
                        </div>
                        <PresenceDot status={member.presence === "Online" ? "ONLINE" : member.presence === "Ocupado" ? "BUSY" : member.presence === "Ausente" ? "AWAY" : "OFFLINE"} />
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader className="gap-1">
                          <DrawerTitle>{member.name}</DrawerTitle>
                          <DrawerDescription>Informações do colaborador</DrawerDescription>
                        </DrawerHeader>
                        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">E-mail</span>
                            <span>{member.email}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Telefone</span>
                            <span>{member.phone || "—"}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Setor</span>
                              <Badge variant="outline">{member.sector}</Badge>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Status</span>
                              <Badge variant={member.role === "Admin" ? "default" : "outline"} className="px-1.5">
                                {member.role === "Admin" && <ShieldCheckIcon className="h-3 w-3" />}
                                {member.role}
                                {member.isSectorLeader && " · Líder"}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Presença</span>
                              <PresenceBadge presence={member.presence} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Atividade</span>
                              <ActivityBadge activity={member.activity} />
                            </div>
                          </div>
                        </div>
                        <DrawerFooter className="mt-6">
                          <DrawerClose render={<Button variant="outline" className="w-full" />}>
                            Fechar
                          </DrawerClose>
                        </DrawerFooter>
                      </DrawerContent>
                    </Drawer>
                  ))}
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push("/notificacoes")}
                className="flex items-center gap-3 rounded-lg py-3 px-2 text-left hover:bg-muted transition-colors"
              >
                <BellIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Notificações</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg py-3 px-2 text-left hover:bg-destructive/10 text-destructive transition-colors"
              >
                <LogOutIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Sair da conta</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
