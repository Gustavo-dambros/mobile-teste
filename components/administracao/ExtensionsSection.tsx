"use client"

import * as React from "react"
import { toast } from "sonner"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { useExtensions } from "@/lib/extensions/store"
import { SectorSelect } from "@/components/sector-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function ExtensionsSection() {
  const { extensions, createExtension, updateExtension, deleteExtension } = useExtensions()
  const [creating, setCreating] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [sector, setSector] = React.useState("")
  const [number, setNumber] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  function resetForm() {
    setName("")
    setSector("")
    setNumber("")
    setCreating(false)
    setEditingId(null)
  }

  function startEdit(id: string) {
    const extension = extensions.find((e) => e.id === id)
    if (!extension) return
    setName(extension.name)
    setSector(extension.sector ?? "")
    setNumber(extension.number)
    setEditingId(id)
    setCreating(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !number.trim()) {
      toast.error("Informe o nome e o ramal")
      return
    }
    setSubmitting(true)
    const input = { name: name.trim(), sector: sector || undefined, number: number.trim() }
    const result = editingId
      ? await updateExtension(editingId, input)
      : await createExtension(input)
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o ramal")
      return
    }
    toast.success(editingId ? "Ramal atualizado" : "Ramal cadastrado")
    resetForm()
  }

  async function handleDelete(id: string) {
    const result = await deleteExtension(id)
    if (!result.ok) toast.error(result.error ?? "Não foi possível excluir")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Lista de ramais exibida pra todo mundo na página Ramal.
        </p>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon />
            Novo ramal
          </Button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-end">
          <Field className="flex-1">
            <FieldLabel htmlFor="ext-name">Nome</FieldLabel>
            <Input id="ext-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Setor ou pessoa" />
          </Field>
          <Field className="flex-1">
            <FieldLabel htmlFor="ext-sector">Setor</FieldLabel>
            <SectorSelect id="ext-sector" value={sector} onValueChange={setSector} />
          </Field>
          <Field className="w-full md:w-40">
            <FieldLabel htmlFor="ext-number">Ramal</FieldLabel>
            <Input id="ext-number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="0000" />
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Ramal</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {extensions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum ramal cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              extensions.map((extension) => (
                <TableRow key={extension.id}>
                  <TableCell>{extension.name}</TableCell>
                  <TableCell>
                    {extension.sector ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        {extension.sector}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{extension.number}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => startEdit(extension.id)}>
                        <PencilIcon />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => void handleDelete(extension.id)}>
                        <Trash2Icon />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
