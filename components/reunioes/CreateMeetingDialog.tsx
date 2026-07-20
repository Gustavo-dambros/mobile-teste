"use client"

import * as React from "react"
import { toast } from "sonner"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { useReunioes } from "@/lib/reunioes/store"
import type { Meeting, RecurrenceType } from "@/lib/reunioes/types"
import { RosterMultiSelect } from "@/components/chat-interno/RosterMultiSelect"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const RECURRENCE_ITEMS: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "Não repetir" },
  { value: "daily", label: "Diariamente" },
  { value: "weekly", label: "Semanalmente" },
  { value: "monthly", label: "Mensalmente" },
]

const DURATION_ITEMS: { value: string; label: string }[] = [
  { value: "none", label: "Sem limite" },
  { value: "30", label: "30 minutos" },
  { value: "45", label: "45 minutos" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2 horas" },
  { value: "180", label: "3 horas" },
]

function timeFromDate(date?: Date) {
  return date ? date.toTimeString().slice(0, 5) : "09:00"
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (meeting: Meeting) => void
}) {
  const { createMeeting } = useReunioes()
  const roster = useChatRoster()
  const [title, setTitle] = React.useState("")
  const [invitedUserIds, setInvitedUserIds] = React.useState<string[]>([])
  const [password, setPassword] = React.useState("")
  const [when, setWhen] = React.useState<"now" | "later">("now")
  const [scheduledDate, setScheduledDate] = React.useState<Date | undefined>(undefined)
  const [scheduledTime, setScheduledTime] = React.useState("09:00")
  const [recurrenceType, setRecurrenceType] = React.useState<RecurrenceType>("none")
  const [recurrenceUntil, setRecurrenceUntil] = React.useState<Date | undefined>(undefined)
  const [notifyInvite, setNotifyInvite] = React.useState(true)
  const [guestChatAllowed, setGuestChatAllowed] = React.useState(true)
  const [guestScreenShareAllowed, setGuestScreenShareAllowed] = React.useState(true)
  const [durationMinutes, setDurationMinutes] = React.useState("none")
  const [submitting, setSubmitting] = React.useState(false)

  const dialogKey = open ? "open" : null
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)
  if (open && dialogKey !== loadedKey) {
    setLoadedKey(dialogKey)
    setTitle("")
    setInvitedUserIds([])
    setPassword("")
    setWhen("now")
    setScheduledDate(undefined)
    setScheduledTime("09:00")
    setRecurrenceType("none")
    setRecurrenceUntil(undefined)
    setNotifyInvite(true)
    setGuestChatAllowed(true)
    setGuestScreenShareAllowed(true)
    setDurationMinutes("none")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Informe um título para a reunião")
      return
    }
    if (password.trim() && password.trim().length < 4) {
      toast.error("A senha deve ter pelo menos 4 caracteres")
      return
    }
    if (when === "later" && !scheduledDate) {
      toast.error("Selecione a data e o horário da reunião")
      return
    }
    if (when === "later" && recurrenceType !== "none" && !recurrenceUntil) {
      toast.error("Defina até quando a reunião deve se repetir")
      return
    }

    let scheduledFor: string | undefined
    if (when === "later" && scheduledDate) {
      const [h, m] = scheduledTime.split(":").map(Number)
      const combined = new Date(scheduledDate)
      combined.setHours(h || 0, m || 0, 0, 0)
      scheduledFor = combined.toISOString()
    }

    setSubmitting(true)
    const result = await createMeeting({
      title,
      invitedUserIds,
      password: password.trim() || undefined,
      scheduledFor,
      recurrenceType: when === "later" ? recurrenceType : "none",
      recurrenceUntil:
        when === "later" && recurrenceType !== "none" && recurrenceUntil
          ? recurrenceUntil.toISOString()
          : undefined,
      notifyInvite,
      guestPermissions: { chat: guestChatAllowed, screenShare: guestScreenShareAllowed },
      durationMinutes: durationMinutes === "none" ? undefined : Number(durationMinutes),
    })
    setSubmitting(false)
    if (!result.ok || !result.meeting) {
      toast.error(result.error ?? "Não foi possível criar a reunião")
      return
    }
    toast.success(when === "later" ? "Reunião agendada" : "Reunião criada")
    onOpenChange(false)
    onCreated(result.meeting)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova reunião</DialogTitle>
          <DialogDescription>
            Crie uma reunião agora ou agende para depois, e convide colaboradores já cadastrados no
            sistema. Você também poderá copiar um link para convidar quem não tem acesso ao sistema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="meeting-title">Título</FieldLabel>
            <Input
              id="meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Alinhamento semanal"
              required
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel>Convidar colaboradores</FieldLabel>
            <RosterMultiSelect
              value={invitedUserIds}
              onChange={setInvitedUserIds}
              options={roster}
              placeholder="Selecionar colaboradores"
            />
          </Field>

          {invitedUserIds.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm">
              <Checkbox checked={notifyInvite} onCheckedChange={(checked) => setNotifyInvite(checked === true)} />
              <span className="flex flex-col">
                <span>Notificar convite</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Mostra um aviso no centro da tela de cada convidado, com opção de aceitar ou recusar
                </span>
              </span>
            </label>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={when === "now" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setWhen("now")}
            >
              Agora
            </Button>
            <Button
              type="button"
              variant={when === "later" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setWhen("later")}
            >
              Agendar
            </Button>
          </div>

          <Field>
            <FieldLabel>Duração</FieldLabel>
            <Select value={durationMinutes} onValueChange={(v) => v && setDurationMinutes(v)} items={DURATION_ITEMS}>
              <SelectTrigger size="sm" className="w-full" aria-label="Duração">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DURATION_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {durationMinutes !== "none" && (
              <span className="text-xs font-normal text-muted-foreground">
                A reunião encerra sozinha ao passar desse tempo — 10 minutos antes, você pode adicionar
                mais tempo se precisar.
              </span>
            )}
          </Field>

          {when === "later" && (
            <>
              <Field orientation="horizontal">
                <FieldLabel className="w-16 shrink-0">Início</FieldLabel>
                <Popover>
                  <PopoverTrigger render={<Button type="button" variant="outline" size="sm" className="flex-1 justify-start" />}>
                    <CalendarIcon data-icon="inline-start" />
                    {scheduledDate
                      ? scheduledDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                      : "Selecionar data"}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto">
                    <PopoverHeader>
                      <PopoverTitle>Data da reunião</PopoverTitle>
                    </PopoverHeader>
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={(d) => {
                        setScheduledDate(d)
                        if (d) setScheduledTime((t) => t || timeFromDate(d))
                      }}
                      disabled={{ before: new Date() }}
                      locale={ptBR}
                      className="mx-auto p-0"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-28"
                />
              </Field>

              <Field>
                <FieldLabel>Repetição</FieldLabel>
                <Select
                  value={recurrenceType}
                  onValueChange={(v) => v && setRecurrenceType(v as RecurrenceType)}
                  items={RECURRENCE_ITEMS}
                >
                  <SelectTrigger size="sm" className="w-full" aria-label="Repetição">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {RECURRENCE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {recurrenceType !== "none" && (
                <Field orientation="horizontal">
                  <FieldLabel className="w-16 shrink-0">Até</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={<Button type="button" variant="outline" size="sm" className={cn("flex-1 justify-start", !recurrenceUntil && "text-muted-foreground")} />}
                    >
                      <CalendarIcon data-icon="inline-start" />
                      {recurrenceUntil
                        ? recurrenceUntil.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                        : "Repetir até"}
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto">
                      <PopoverHeader>
                        <PopoverTitle>Repetir até</PopoverTitle>
                      </PopoverHeader>
                      <Calendar
                        mode="single"
                        selected={recurrenceUntil}
                        onSelect={setRecurrenceUntil}
                        disabled={{ before: scheduledDate ?? new Date() }}
                        locale={ptBR}
                        className="mx-auto p-0"
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              )}
            </>
          )}

          <Field>
            <FieldLabel htmlFor="meeting-password">Senha de acesso (opcional)</FieldLabel>
            <Input
              id="meeting-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para não exigir senha"
            />
          </Field>

          <Field>
            <FieldLabel>Permissões de quem entra pelo link</FieldLabel>
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={guestChatAllowed}
                  onCheckedChange={(checked) => setGuestChatAllowed(checked === true)}
                />
                Usar o chat
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={guestScreenShareAllowed}
                  onCheckedChange={(checked) => setGuestScreenShareAllowed(checked === true)}
                />
                Compartilhar tela
              </label>
              <span className="text-xs font-normal text-muted-foreground">
                Vale só para quem entra pelo link de convite, sem login. Colaboradores convidados
                diretamente sempre têm acesso completo.
              </span>
            </div>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {when === "later" ? "Agendar reunião" : "Criar reunião"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
