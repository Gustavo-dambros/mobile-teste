"use client"

import * as React from "react"
import { toast } from "sonner"
import { AlertTriangleIcon, Loader2Icon } from "lucide-react"

import type { AdminUser, UserRole, UserStatus } from "@/components/administracao/types"
import { roleItems, userStatusItems } from "@/components/administracao/types"
import { useAdministracao } from "@/lib/administracao/store"
import { sectorOptions } from "@/components/sector-select"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FormState {
  name: string
  email: string
  sector: string
  phone: string
  role: UserRole
  isSectorLeader: boolean
  status: UserStatus
}

function toFormState(user: AdminUser): FormState {
  return {
    name: user.name,
    email: user.email,
    sector: user.sector,
    phone: user.phone,
    role: user.role,
    isSectorLeader: user.isSectorLeader,
    status: user.status,
  }
}

export function UserEditDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { editUser, isEmailTaken, getSectorLeader } = useAdministracao()
  const [form, setForm] = React.useState<FormState | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [lastUserId, setLastUserId] = React.useState<string | null>(null)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  if (user && user.id !== lastUserId) {
    setLastUserId(user.id)
    setForm(toFormState(user))
    setError(null)
  }

  if (!user || !form) return null

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  function validate(): string | null {
    if (!form!.name.trim()) return "Informe o nome completo."
    if (!/^\S+@\S+\.\S+$/.test(form!.email.trim())) return "Informe um e-mail válido."
    if (isEmailTaken(form!.email.trim(), user!.id)) return "Este e-mail já pertence a outro usuário."
    if (!form!.sector) return "Selecione o setor."
    if (!form!.phone.trim()) return "Informe o telefone."
    return null
  }

  async function commitSave() {
    setSubmitting(true)
    try {
      await editUser(user!.id, {
        name: form!.name.trim(),
        email: form!.email.trim(),
        sector: form!.sector,
        phone: form!.phone.trim(),
        role: form!.role,
        isSectorLeader: form!.isSectorLeader,
        status: form!.status,
      })
      setReplaceConfirmOpen(false)
      onOpenChange(false)
      toast.success("Usuário atualizado com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o usuário")
    } finally {
      setSubmitting(false)
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }
    setError(null)

    const currentLeader = form!.isSectorLeader ? getSectorLeader(form!.sector, user!.id) : undefined
    if (currentLeader) {
      setReplaceConfirmOpen(true)
      return
    }
    commitSave()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Atualize os dados de {user.name}.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex max-h-[65vh] flex-col overflow-y-auto pr-1">
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="edit-name">Nome</FieldLabel>
                <Input id="edit-name" value={form.name} onChange={(e) => update("name", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-email">E-mail</FieldLabel>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-sector">Setor</FieldLabel>
                <Select value={form.sector} items={sectorOptions} onValueChange={(v) => v && update("sector", v)}>
                  <SelectTrigger id="edit-sector" className="w-full">
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {sectorOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-phone">Telefone</FieldLabel>
                <Input id="edit-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-role">Perfil de acesso</FieldLabel>
                <Select
                  value={form.role}
                  items={roleItems}
                  onValueChange={(v) => v && update("role", v as UserRole)}
                >
                  <SelectTrigger id="edit-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {roleItems.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-status">Status da conta</FieldLabel>
                <Select
                  value={form.status}
                  items={userStatusItems}
                  onValueChange={(v) => v && update("status", v as UserStatus)}
                >
                  <SelectTrigger id="edit-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {userStatusItems.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={form.isSectorLeader}
                  onCheckedChange={(checked) => update("isSectorLeader", !!checked)}
                />
                Definir como líder de setor
              </label>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </FieldGroup>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={replaceConfirmOpen} onOpenChange={(next) => !submitting && setReplaceConfirmOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir líder de setor?</AlertDialogTitle>
            <AlertDialogDescription>
              O setor {form.sector} já possui um líder ({getSectorLeader(form.sector, user.id)?.name}). Ao
              continuar, o líder atual perderá essa função e {user.name} será definido como líder do
              setor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={commitSave} disabled={submitting}>
              {submitting && <Loader2Icon className="animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
