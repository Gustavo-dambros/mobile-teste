"use client"

import * as React from "react"
import { toast } from "sonner"
import { AlertTriangleIcon, Loader2Icon } from "lucide-react"

import type { AccessRequest, UserRole } from "@/components/administracao/types"
import { useAdministracao } from "@/lib/administracao/store"
import { formatCPFMask, formatDateTime } from "@/lib/administracao/format"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export function AccessRequestViewDialog({
  request,
  open,
  onOpenChange,
}: {
  request: AccessRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { approveRequest, rejectRequest, getSectorLeader } = useAdministracao()
  const [role, setRole] = React.useState<UserRole>("USER")
  const [isSectorLeader, setIsSectorLeader] = React.useState(false)
  const [lastRequestId, setLastRequestId] = React.useState<string | null>(null)
  const [approveConfirmOpen, setApproveConfirmOpen] = React.useState(false)
  const [rejectConfirmOpen, setRejectConfirmOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  if (request && request.id !== lastRequestId) {
    setLastRequestId(request.id)
    setRole("USER")
    setIsSectorLeader(false)
  }

  if (!request) return null

  const isPending = request.status === "PENDING"
  const currentLeader = getSectorLeader(request.sector)
  const willReplaceLeader = isSectorLeader && !!currentLeader && currentLeader.name !== request.name

  async function handleConfirmApprove() {
    setSubmitting(true)
    try {
      const { notified } = await approveRequest(request!, { role, isSectorLeader })
      setApproveConfirmOpen(false)
      onOpenChange(false)
      if (notified) {
        toast.success("Acesso liberado com sucesso. O usuário foi avisado no WhatsApp.")
      } else {
        toast.warning(
          "Acesso liberado, mas não foi possível enviar o aviso no WhatsApp. Informe o usuário manualmente."
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível liberar o acesso")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmReject() {
    setSubmitting(true)
    try {
      const { notified } = await rejectRequest(request!.id)
      setRejectConfirmOpen(false)
      onOpenChange(false)
      if (notified) {
        toast.success("Solicitação rejeitada. O usuário foi avisado no WhatsApp.")
      } else {
        toast.warning(
          "Solicitação rejeitada, mas não foi possível enviar o aviso no WhatsApp."
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível rejeitar a solicitação")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitação de acesso</DialogTitle>
            <DialogDescription>Enviada em {formatDateTime(request.createdAt)}</DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome completo" value={request.name} />
              <Field label="E-mail" value={request.email} />
              <Field label="Setor" value={request.sector} />
              <Field label="Telefone" value={request.phone} />
              <Field label="CPF" value={formatCPFMask(request.cpf)} />
            </div>

            {!isPending && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                Esta solicitação já foi {request.status === "APPROVED" ? "aprovada" : "rejeitada"}
                {request.approvedByName && ` por ${request.approvedByName}`}
                {request.approvedAt && ` em ${formatDateTime(request.approvedAt)}`}.
              </div>
            )}

            {isPending && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <Checkbox
                      checked={role === "ADMIN"}
                      onCheckedChange={(checked) => setRole(checked ? "ADMIN" : "USER")}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Definir como administrador</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Concede acesso total à área de Administração.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <Checkbox
                      checked={isSectorLeader}
                      onCheckedChange={(checked) => setIsSectorLeader(!!checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Definir como líder de setor</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Identifica o usuário como líder do setor {request.sector}.
                      </span>
                    </span>
                  </label>
                  {willReplaceLeader && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                      <p>
                        O setor {request.sector} já possui um líder ({currentLeader?.name}). Ao
                        continuar, ele perderá essa função.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {isPending && (
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => setRejectConfirmOpen(true)} disabled={submitting}>
                Rejeitar solicitação
              </Button>
              <Button onClick={() => setApproveConfirmOpen(true)} disabled={submitting}>
                Liberar acesso
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={approveConfirmOpen}
        onOpenChange={(next) => !submitting && setApproveConfirmOpen(next)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar liberação de acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário {request.name} será criado no setor {request.sector} e receberá acesso ao
              sistema como {role === "ADMIN" ? "administrador" : "usuário"}.
              {willReplaceLeader && " O líder atual do setor perderá essa função."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApprove} disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              Confirmar liberação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={rejectConfirmOpen}
        onOpenChange={(next) => !submitting && setRejectConfirmOpen(next)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              A solicitação de {request.name} será marcada como rejeitada e não poderá mais ser
              aprovada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmReject} disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              Confirmar rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
