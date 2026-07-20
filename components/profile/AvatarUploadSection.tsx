"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import { CameraIcon, Loader2Icon, Trash2Icon } from "lucide-react"

import { hoverScaleSm, microTap, scaleIn, tapScaleSm } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { ACCEPTED_AVATAR_TYPES, validateAvatarFile } from "@/lib/profile/upload"
import type { PresenceStatus } from "@/components/profile/types"
import { PresenceDot } from "@/components/profile/PresenceDot"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function AvatarUploadSection({
  name,
  avatarUrl,
  presenceStatus,
  disabled,
  uploading,
  onFileSelected,
  onRemove,
}: {
  name: string
  avatarUrl: string | null
  presenceStatus: PresenceStatus
  disabled: boolean
  uploading: boolean
  onFileSelected: (file: File) => void
  onRemove: () => void
}) {
  const reduced = useReducedMotion()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false)

  const displayUrl = avatarUrl

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const error = validateAvatarFile(file)
    if (error) {
      toast.error(error)
      return
    }

    onFileSelected(file)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 shrink-0">
        <motion.div
          key={displayUrl ?? "empty"}
          variants={scaleIn(reduced)}
          initial="hidden"
          animate="show"
          className="size-full overflow-hidden rounded-full ring-1 ring-border"
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- object/blob URLs aren't compatible with next/image's remote loader
            <img src={displayUrl} alt={name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted text-lg font-medium text-muted-foreground">
              {initialsOf(name)}
            </div>
          )}
        </motion.div>
        <span
          className={cn(
            "absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full bg-background ring-2 ring-background"
          )}
        >
          <PresenceDot status={presenceStatus} className="size-3" />
        </span>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2Icon className="size-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <motion.div
            whileHover={reduced ? undefined : hoverScaleSm}
            whileTap={reduced ? undefined : tapScaleSm}
            transition={microTap(reduced)}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              <CameraIcon data-icon="inline-start" />
              Alterar foto
            </Button>
          </motion.div>
          {displayUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => setRemoveConfirmOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Remover foto
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP. Máximo de 5 MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_AVATAR_TYPES}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover foto de perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua foto será substituída pelo avatar padrão com suas iniciais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemove()
                setRemoveConfirmOpen(false)
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
