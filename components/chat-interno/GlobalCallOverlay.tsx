"use client"

import * as React from "react"

import { useCurrentUser } from "@/lib/current-user/context"
import { notifyBrowser, requestNotificationPermission } from "@/lib/notifications/browser-notifications"
import { useChatInterno } from "@/lib/chat-interno/store"
import { useRosterMember } from "@/lib/chat-interno/use-roster"
import type { Call, CallStatus } from "@/lib/chat-interno/types"
import { CallRingDialog } from "@/components/chat-interno/CallRingDialog"
import { ChatCallRoom } from "@/components/chat-interno/ChatCallRoom"

const RING_TIMEOUT_MS = 30_000

/**
 * A group call is one shared row, but each invited member answers
 * independently — "is this call ringing/active FOR ME" comes from my own
 * `call_participants` entry, never from the shared `status` alone (that
 * would make one person answering auto-join everyone else, and one
 * decline/timeout drop participants who already answered or are still
 * deciding). The caller is the exception: they aren't "invited", so their
 * own ring/room transition is driven by the shared status directly, exactly
 * like before.
 */
function myParticipantStatus(call: Call, userId: string) {
  return call.participants.find((p) => p.userId === userId)?.status
}

function isRingingForMe(call: Call, userId: string) {
  if (call.callerId === userId) return call.status === "ringing"
  if (call.status !== "ringing" && call.status !== "active") return false
  return myParticipantStatus(call, userId) === "ringing"
}

function isActiveForMe(call: Call, userId: string) {
  if (call.callerId === userId) return call.status === "active"
  if (call.status !== "active") return false
  return myParticipantStatus(call, userId) === "active"
}

/** What CallRingDialog should render as `call.status` for the current user specifically. */
function dialogStatusForMe(call: Call, userId: string): CallStatus {
  if (call.callerId === userId) return call.status
  const mine = myParticipantStatus(call, userId)
  if (mine === "declined" || mine === "missed") return mine
  // The whole call ended (caller cancelled before I answered, or hanging up
  // a 2-person call also cancels everyone else still ringing) while my own
  // row never left "ringing" — CallRingDialog has no "ended" outcome, so
  // from my side that reads the same as having missed it.
  if (call.status === "ended" && mine === "ringing") return "missed"
  return call.status
}

/**
 * Mounted once at the app-shell level (app/(app)/layout.tsx), not inside the
 * chat-interno pages — this is what makes a call ring/keep running no matter
 * which page you're on. ChatInternoShell used to own this same
 * ringing/active derivation and render CallRingDialog/ChatCallRoom itself,
 * but that meant navigating away from /chat-interno unmounted everything
 * (and disconnected the LiveKit room). Moving it here fixes that; the
 * LiveKit Room instance inside ChatCallRoom now only ever unmounts when the
 * call actually ends, never when switching pages or minimizing.
 */
export function GlobalCallOverlay() {
  const currentUser = useCurrentUser()
  const { calls, getConversation, answerCall, declineCall, missCall, endCall } = useChatInterno()

  const [dialogCallId, setDialogCallId] = React.useState<string | null>(null)
  const [activeCallId, setActiveCallId] = React.useState<string | null>(null)
  const [minimized, setMinimized] = React.useState(false)

  // Adjusted during render rather than in an effect: this only ever narrows
  // (null -> an id) in reaction to `calls`, so it converges in the same
  // render pass instead of looping. Mirrors the pattern ChatInternoShell
  // used to own.
  if (dialogCallId === null && currentUser) {
    const ringing = [...calls]
      .filter((c) => isRingingForMe(c, currentUser.id))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
    if (ringing) setDialogCallId(ringing.id)
  }
  if (activeCallId === null && currentUser) {
    const active = calls.find((c) => isActiveForMe(c, currentUser.id))
    if (active) {
      setActiveCallId(active.id)
      setMinimized(false)
    }
  }
  if (activeCallId !== null && dialogCallId === activeCallId) {
    setDialogCallId(null)
  }

  React.useEffect(() => {
    requestNotificationPermission()
  }, [])

  const dialogCall = dialogCallId ? calls.find((c) => c.id === dialogCallId) : undefined
  const roomCall = activeCallId ? calls.find((c) => c.id === activeCallId) : undefined
  const dialogConversation = dialogCall ? getConversation(dialogCall.conversationId) : undefined
  const roomConversation = roomCall ? getConversation(roomCall.conversationId) : undefined

  const isGroupDialog = dialogConversation?.kind === "group"
  const dialogPeerId = dialogConversation && !isGroupDialog ? dialogConversation.memberIds[0] : undefined
  const dialogPeer = useRosterMember(dialogPeerId)
  const dialogTitle = isGroupDialog ? (dialogConversation?.name ?? "Grupo") : (dialogPeer?.name ?? "Contato")

  // Fires an OS-level notification the moment a NEW incoming call starts
  // ringing — only useful when the tab isn't focused (notifyBrowser itself
  // checks that), so this is a courtesy on top of the in-app dialog, not a
  // replacement for it.
  const notifiedCallIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!dialogCall || !dialogConversation) return
    if (dialogCall.callerId === currentUser?.id) return
    if (notifiedCallIdRef.current === dialogCall.id) return
    notifiedCallIdRef.current = dialogCall.id
    notifyBrowser(
      `Chamada de ${dialogTitle}`,
      dialogCall.kind === "video" ? "Chamada de vídeo recebida" : "Chamada de voz recebida",
      { tag: "chat-interno-call", requireInteraction: true }
    )
  }, [dialogCall, dialogConversation, dialogTitle, currentUser?.id])

  const isDialogMine = dialogCall && currentUser ? dialogCall.callerId === currentUser.id : false
  const myDialogStatus =
    dialogCall && currentUser ? dialogStatusForMe(dialogCall, currentUser.id) : undefined
  // Only a string id when *I* (not the caller) am still personally ringing —
  // stable across polls unless my own status actually changes, so this
  // doesn't reset the timeout below every 3s poll tick the way depending on
  // the `dialogCall` object itself would (a new object arrives every poll).
  const myRingTimeoutTarget = dialogCall && !isDialogMine && myDialogStatus === "ringing" ? dialogCall.id : null

  // Each invited participant's own client owns its own 30s timeout — the
  // caller no longer runs a single call-wide timer, so one person not
  // answering only drops the call for them (see missCall/[callId]/miss).
  React.useEffect(() => {
    if (!myRingTimeoutTarget) return
    const callId = myRingTimeoutTarget
    const timer = window.setTimeout(() => {
      void missCall(callId)
    }, RING_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [myRingTimeoutTarget, missCall])

  return (
    <>
      {dialogCall && dialogConversation && currentUser && (
        <CallRingDialog
          call={{ ...dialogCall, status: myDialogStatus ?? dialogCall.status }}
          conversation={dialogConversation}
          direction={isDialogMine ? "outgoing" : "incoming"}
          onAnswer={() => answerCall(dialogCall.id)}
          onDecline={() => declineCall(dialogCall.id)}
          onCancel={() => endCall(dialogCall.id)}
          onDismiss={() => setDialogCallId(null)}
        />
      )}
      {roomCall && roomConversation && (
        <ChatCallRoom
          call={roomCall}
          conversation={roomConversation}
          minimized={minimized}
          onToggleMinimize={() => setMinimized((m) => !m)}
          onEnd={() => {
            setActiveCallId(null)
            setMinimized(false)
            if (roomCall.status === "active") endCall(roomCall.id)
          }}
        />
      )}
    </>
  )
}
