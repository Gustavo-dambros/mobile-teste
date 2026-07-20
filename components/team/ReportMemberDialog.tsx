"use client"

import * as React from "react"
import { toast } from "sonner"

import type { DirectoryMember } from "@/lib/team/directory"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const reportReasons = [
  { label: "Comportamento inadequado", value: "Comportamento inadequado" },
  { label: "Assédio", value: "Assédio" },
  { label: "Informação incorreta", value: "Informação incorreta" },
  { label: "Outro", value: "Outro" },
]

export function ReportMemberDialog({
  member,
  onOpenChange,
}: {
  member: DirectoryMember | null
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [loadedMemberId, setLoadedMemberId] = React.useState<string | null>(null)

  if (member && member.id !== loadedMemberId) {
    setLoadedMemberId(member.id)
    setReason("")
    setDescription("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!member) return
    if (!reason) {
      toast.error("Selecione o motivo da denúncia")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/team/${member.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description: description.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar a denúncia")
      toast.success("Denúncia registrada para análise")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a denúncia")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Denunciar {member?.name}</DialogTitle>
          <DialogDescription>
            Sua denúncia será enviada para análise do administrador.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="report-member-reason">Motivo da denúncia</FieldLabel>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value ?? "")}
              items={reportReasons}
            >
              <SelectTrigger id="report-member-reason" className="w-full">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {reportReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="report-member-description">
              Descrição (opcional)
            </FieldLabel>
            <Textarea
              id="report-member-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione mais detalhes, se quiser"
              rows={3}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar denúncia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
