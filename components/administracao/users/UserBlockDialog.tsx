"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"

import type { AdminUser } from "@/components/administracao/types"
import { useAdministracao } from "@/lib/administracao/store"
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

export function UserBlockDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { setUserStatus, currentUserId } = useAdministracao()
  const [submitting, setSubmitting] = React.useState(false)

  if (!user) return null

  const isBlocking = user.status === "ACTIVE"
  const isSelf = user.id === currentUserId

  async function handleConfirm() {
    if (isSelf) return
    setSubmitting(true)
    try {
      await setUserStatus(user!.id, isBlocking ? "BLOCKED" : "ACTIVE")
      onOpenChange(false)
      toast.success(isBlocking ? "Usuário bloqueado com sucesso." : "Usuário desbloqueado com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o status")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocking ? "Tem certeza de que deseja bloquear este usuário?" : "Desbloquear este usuário?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocking
              ? `${user.name} perderá o acesso ao sistema até que seja desbloqueado por um administrador.`
              : `${user.name} voltará a ter acesso normal ao sistema.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={isBlocking ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting && <Loader2Icon className="animate-spin" />}
            {isBlocking ? "Confirmar bloqueio" : "Confirmar desbloqueio"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
