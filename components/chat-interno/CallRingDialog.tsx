"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { PhoneIcon, PhoneOffIcon } from "lucide-react"

import { callRingPulse } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { CallSoundPlayer } from "@/lib/chat-interno/call-sounds"
import { useRosterMember } from "@/lib/chat-interno/use-roster"
import type { Call, Conversation } from "@/lib/chat-interno/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

const OUTCOME_DISPLAY_MS = 2500

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

/**
 * Outgoing calls go through two locally-timed phases before the callee even
 * answers: "dialing" (ligando.mp3 plays once) then, one second after it
 * ends, "ringing" (chamando.mp3 loops). Incoming calls skip straight to
 * playing recebendo.mp3 — that tone is exclusively the receiver's.
 */
export function CallRingDialog({
  call,
  conversation,
  direction,
  onAnswer,
  onDecline,
  onCancel,
  onDismiss,
}: {
  call: Call
  conversation: Conversation
  direction: "outgoing" | "incoming"
  onAnswer: () => void
  onDecline: () => void
  onCancel: () => void
  /** Tell the parent this dialog is done and can stop being shown. */
  onDismiss: () => void
}) {
  const reduced = useReducedMotion()
  const isGroup = conversation.kind === "group"
  const otherMember = useRosterMember(!isGroup ? conversation.memberIds[0] : undefined)
  const title = isGroup ? (conversation.name ?? "Grupo") : (otherMember?.name ?? "Contato")

  const [sound] = React.useState(() => new CallSoundPlayer())

  const [outgoingPhase, setOutgoingPhase] = React.useState<"dialing" | "ringing">("dialing")
  const [outcome, setOutcome] = React.useState<"declined" | "missed" | null>(null)

  // Outgoing: ligando.mp3 once -> wait 1s -> chamando.mp3 looped.
  React.useEffect(() => {
    if (direction !== "outgoing" || outcome) return
    let delayTimer: number | undefined

    sound.play("dialing", {
      onEnded: () => {
        delayTimer = window.setTimeout(() => {
          setOutgoingPhase("ringing")
          sound.play("ringing", { loop: true })
        }, 1000)
      },
    })

    return () => {
      if (delayTimer) window.clearTimeout(delayTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, call.id])

  // Incoming: recebendo.mp3 looped for as long as it's ringing.
  React.useEffect(() => {
    if (direction !== "incoming" || outcome) return
    sound.play("incoming", { loop: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, call.id])

  // React to the call being resolved by the other side: declined or missed.
  React.useEffect(() => {
    if (call.status !== "declined" && call.status !== "missed") return
    const resolved = call.status
    const settleTimer = window.setTimeout(() => {
      setOutcome(resolved)
      sound.play(resolved === "declined" ? "declined" : "missed")
    }, 0)
    const dismissTimer = window.setTimeout(onDismiss, OUTCOME_DISPLAY_MS)
    return () => {
      window.clearTimeout(settleTimer)
      window.clearTimeout(dismissTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.status])

  React.useEffect(() => {
    return () => sound.stop()
  }, [sound])

  function handleAnswer() {
    sound.stop()
    onAnswer()
  }

  function handleDecline() {
    sound.stop()
    onDecline()
    onDismiss()
  }

  function handleCancel() {
    sound.stop()
    onCancel()
    onDismiss()
  }

  const statusLabel = outcome
    ? outcome === "declined"
      ? "Chamada recusada"
      : "Chamada não atendida"
    : direction === "outgoing"
      ? outgoingPhase === "dialing"
        ? "Ligando..."
        : "Chamando..."
      : `Chamada de ${call.kind === "video" ? "vídeo" : "voz"} recebida`

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="flex flex-col items-center gap-5 py-8 sm:max-w-sm">
        <DialogTitle className="sr-only">Chamada com {title}</DialogTitle>
        <motion.div variants={callRingPulse(reduced)} initial="hidden" animate="show">
          <Avatar size="lg" className="size-24">
            <AvatarFallback className="text-2xl">{initials(title)}</AvatarFallback>
          </Avatar>
        </motion.div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg font-semibold">{title}</span>
          <span className={cn("text-sm", outcome ? "font-medium text-destructive" : "text-muted-foreground")}>
            {statusLabel}
          </span>
        </div>
        {!outcome && (
          <div className="flex items-center gap-4">
            {direction === "incoming" && (
              <Button
                type="button"
                size="icon-lg"
                className="rounded-full bg-green-600 text-white hover:bg-green-600/90"
                onClick={handleAnswer}
              >
                <PhoneIcon />
                <span className="sr-only">Atender</span>
              </Button>
            )}
            <Button
              type="button"
              size="icon-lg"
              variant="destructive"
              className="rounded-full"
              onClick={direction === "outgoing" ? handleCancel : handleDecline}
            >
              <PhoneOffIcon />
              <span className="sr-only">{direction === "outgoing" ? "Cancelar" : "Recusar"}</span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
