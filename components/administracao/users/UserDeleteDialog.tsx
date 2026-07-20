"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"

import type { AdminUser } from "@/components/administracao/types"
import { useAdministracao } from "@/lib/administracao/store"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const CONFIRM_WORD = "DELETAR"

export function UserDeleteDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { deleteUser, currentUserId } = useAdministracao()
  const [confirmText, setConfirmText] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [lastOpenKey, setLastOpenKey] = React.useState<string | null>(null)

  const openKey = open && user ? user.id : null
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) setConfirmText("")
  }

  if (!user) return null

  const isSelf = user.id === currentUserId
  const canDelete = confirmText === CONFIRM_WORD && !isSelf

  async function handleConfirm() {
    if (!canDelete) return
    setSubmitting(true)
    try {
      await deleteUser(user!.id)
      onOpenChange(false)
      toast.success("Usuário excluído com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o usuário")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir permanentemente o usuário {user.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {user.email} — esta ação não poderá ser desfeita. Para confirmar, digite{" "}
            <span className="font-semibold text-foreground">{CONFIRM_WORD}</span> no campo abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Field>
          <FieldLabel htmlFor="delete-confirm" className="sr-only">
            Confirmação
          </FieldLabel>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
          />
        </Field>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canDelete || submitting}>
            {submitting && <Loader2Icon className="animate-spin" />}
            Excluir permanentemente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
