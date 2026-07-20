"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"

import { listContainer, listItem } from "@/lib/motion"
import { useProfile } from "@/lib/profile/store"
import { revokeAvatarUrl, uploadAvatarFile } from "@/lib/profile/upload"
import type { PresenceStatus, WorkActivityStatus } from "@/components/profile/types"
import { AvatarUploadSection } from "@/components/profile/AvatarUploadSection"
import { PresenceDot } from "@/components/profile/PresenceDot"
import { PresenceSection } from "@/components/profile/PresenceSection"
import { ReadOnlyInfoSection } from "@/components/profile/ReadOnlyInfoSection"
import { StatusMessageSection } from "@/components/profile/StatusMessageSection"
import { WorkActivitySection } from "@/components/profile/WorkActivitySection"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

const presenceLabel: Record<PresenceStatus, string> = {
  ONLINE: "Online",
  BUSY: "Ocupado",
  AWAY: "Ausente",
  OFFLINE: "Offline",
}

export function ProfileModal() {
  const reduced = useReducedMotion()
  const { profile, isModalOpen, closeProfileModal, updateProfile } = useProfile()

  const [avatarDraft, setAvatarDraft] = React.useState<string | null | undefined>(undefined)
  const [presenceDraft, setPresenceDraft] = React.useState<PresenceStatus>(profile.presenceStatus)
  const [activityDraft, setActivityDraft] = React.useState<WorkActivityStatus>(profile.workActivityStatus)
  const [messageDraft, setMessageDraft] = React.useState(profile.statusMessage)
  const [uploading, setUploading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [wasOpen, setWasOpen] = React.useState(false)

  if (isModalOpen && !wasOpen) {
    setWasOpen(true)
    setAvatarDraft(undefined)
    setPresenceDraft(profile.presenceStatus)
    setActivityDraft(profile.workActivityStatus)
    setMessageDraft(profile.statusMessage)
  } else if (!isModalOpen && wasOpen) {
    setWasOpen(false)
  }

  const effectiveAvatarUrl = avatarDraft !== undefined ? avatarDraft : profile.avatarUrl

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

  function handleRemove() {
    if (avatarDraft) revokeAvatarUrl(avatarDraft)
    setAvatarDraft(null)
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      if (avatarDraft) revokeAvatarUrl(avatarDraft)
      closeProfileModal()
    }
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
    closeProfileModal()
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            {profile.sector}
            <span className="text-muted-foreground/50">•</span>
            <PresenceDot status={presenceDraft} />
            {presenceLabel[presenceDraft]}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          variants={listContainer(reduced)}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5 overflow-y-auto pr-1"
        >
          <motion.div variants={listItem(reduced)}>
            <AvatarUploadSection
              name={profile.name}
              avatarUrl={effectiveAvatarUrl}
              presenceStatus={presenceDraft}
              disabled={submitting}
              uploading={uploading}
              onFileSelected={handleFileSelected}
              onRemove={handleRemove}
            />
          </motion.div>

          <Separator />

          <motion.div variants={listItem(reduced)}>
            <ReadOnlyInfoSection profile={profile} />
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

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting || uploading}>
            {submitting && <Loader2Icon className="animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
