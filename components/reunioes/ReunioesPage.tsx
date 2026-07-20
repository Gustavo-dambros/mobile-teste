"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import { LinkIcon, PlusIcon, VideoIcon, VideoOffIcon } from "lucide-react"

import { cardsContainer, fadeIn, metricCard, pageHeader } from "@/lib/motion"
import { useCurrentUser } from "@/lib/current-user/context"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { useReunioes } from "@/lib/reunioes/store"
import type { Meeting } from "@/lib/reunioes/types"
import { CreateMeetingDialog } from "@/components/reunioes/CreateMeetingDialog"
import { RecordingsTab } from "@/components/reunioes/RecordingsTab"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

function inviteLinkFor(meeting: Meeting) {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/reunioes/entrar/${meeting.inviteToken}`
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Repete diariamente",
  weekly: "Repete semanalmente",
  monthly: "Repete mensalmente",
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const reduced = useReducedMotion()
  const { endMeeting } = useReunioes()
  const currentUser = useCurrentUser()
  const roster = useChatRoster()
  const isHost = meeting.hostId === currentUser?.id
  const isActive = meeting.status === "ativa"
  const isScheduled = meeting.status === "agendada"
  const invited = roster.filter((m) => meeting.invitedUserIds.includes(m.id))

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteLinkFor(meeting))
    toast.success("Link de convite copiado")
  }

  async function handleEnd() {
    const result = await endMeeting(meeting.id)
    if (!result.ok) toast.error(result.error ?? "Não foi possível encerrar a reunião")
  }

  return (
    <motion.div variants={metricCard(reduced)}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{meeting.title}</CardTitle>
            <Badge variant={isActive ? "default" : isScheduled ? "secondary" : "outline"}>
              {isActive ? "Ativa" : isScheduled ? "Agendada" : "Encerrada"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isScheduled && meeting.scheduledFor && (
            <p className="text-sm font-medium">
              {new Date(meeting.scheduledFor).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {meeting.recurrenceType !== "none" && (
                <span className="ml-1 font-normal text-muted-foreground">
                  · {RECURRENCE_LABELS[meeting.recurrenceType]}
                </span>
              )}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Anfitrião: {isHost ? "Você" : meeting.hostName}
            {!isScheduled && (
              <>
                {" "}
                · {meeting.participants.length}{" "}
                {meeting.participants.length === 1 ? "participante" : "participantes"}
              </>
            )}
            {isHost && meeting.waitingGuests.length > 0 && (
              <> · {meeting.waitingGuests.length} aguardando</>
            )}
          </p>
          {invited.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {invited.map((m) => (
                <Badge key={m.id} variant="secondary">
                  {m.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={meeting.status === "encerrada"}
              nativeButton={false}
              render={<Link href={`/reunioes/${meeting.id}`} />}
            >
              <VideoIcon data-icon="inline-start" />
              {isScheduled ? (isHost ? "Iniciar" : "Ver detalhes") : "Entrar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              disabled={meeting.status === "encerrada"}
            >
              <LinkIcon data-icon="inline-start" />
              Copiar link
            </Button>
          </div>
          {isHost && meeting.status !== "encerrada" && (
            <Button size="sm" variant="destructive" onClick={handleEnd}>
              Encerrar
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

function MeetingSection({
  title,
  meetings,
  reduced,
  emptyHint,
}: {
  title: string
  meetings: Meeting[]
  reduced: boolean | null
  emptyHint?: string
}) {
  if (meetings.length === 0 && !emptyHint) return null
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <motion.div
          variants={cardsContainer(reduced)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {meetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </motion.div>
      )}
    </div>
  )
}

export function ReunioesPage() {
  const reduced = useReducedMotion()
  const router = useRouter()
  // The meetings list is now polled globally by ReunioesProvider itself (see lib/reunioes/store.tsx)
  // so the sidebar badge / invite modal have data even off this page — nothing to do here but read it.
  const { meetings } = useReunioes()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [view, setView] = React.useState<"meetings" | "recordings">("meetings")

  // Ended meetings are never shown here — no "history" tab by design (the data stays in
  // the database for audit, see GET /api/reunioes, which already excludes them from the list).
  const visibleMeetings = meetings.filter((m) => m.status !== "encerrada")
  const active = visibleMeetings.filter((m) => m.status === "ativa")
  const scheduled = [...visibleMeetings.filter((m) => m.status === "agendada")].sort((a, b) =>
    (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? "")
  )

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <motion.div
        variants={pageHeader(reduced, 0.05)}
        initial="hidden"
        animate="show"
        className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6"
      >
        <div>
          <h2 className="text-lg font-semibold">Reuniões</h2>
          <p className="text-sm text-muted-foreground">
            Crie reuniões instantâneas, convide colaboradores ou gere um link para gente de fora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => v && setView(v as "meetings" | "recordings")}>
            <TabsList>
              <TabsTrigger value="meetings">Reuniões</TabsTrigger>
              <TabsTrigger value="recordings">Gravações</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Nova reunião
          </Button>
        </div>
      </motion.div>

      <div className="flex flex-col gap-6 px-4 lg:px-6">
        {view === "recordings" ? (
          <RecordingsTab />
        ) : visibleMeetings.length === 0 ? (
          <motion.div
            variants={fadeIn(reduced, 0.15)}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center"
          >
            <VideoOffIcon className="size-6 text-muted-foreground" />
            <h3 className="text-sm font-medium">Nenhuma reunião ainda</h3>
            <p className="text-sm text-muted-foreground">
              Crie uma reunião para começar uma chamada agora.
            </p>
          </motion.div>
        ) : (
          <>
            <MeetingSection title="Acontecendo agora" meetings={active} reduced={reduced} />
            <MeetingSection title="Agendadas" meetings={scheduled} reduced={reduced} />
          </>
        )}
      </div>

      <CreateMeetingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(meeting) => {
          // Only jump straight into the room for an instant meeting — visiting
          // a scheduled one as host would auto-start it early (see /[id]/join).
          if (meeting.status === "ativa") router.push(`/reunioes/${meeting.id}`)
        }}
      />
    </div>
  )
}
