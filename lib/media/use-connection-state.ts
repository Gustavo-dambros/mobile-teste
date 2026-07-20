"use client"

import * as React from "react"
import { ConnectionQuality, ConnectionState, RoomEvent, type Participant, type Room } from "livekit-client"

export type ConnectionBadgeState = "reconnecting" | "poor"

/** Tracks reconnect attempts and local connection quality for a LiveKit room —
 * feeds a small "Reconectando..." / "Conexão instável" badge in the call UI. */
export function useConnectionState(room: Room | null): ConnectionBadgeState | null {
  const [state, setState] = React.useState<ConnectionBadgeState | null>(null)

  React.useEffect(() => {
    if (!room) return
    setState(null)

    function handleStateChange(connectionState: ConnectionState) {
      if (connectionState === ConnectionState.Reconnecting) setState("reconnecting")
      else if (connectionState === ConnectionState.Connected) setState(null)
    }
    function handleQuality(quality: ConnectionQuality, participant: Participant) {
      if (!participant.isLocal) return
      setState((prev) => {
        if (prev === "reconnecting") return prev
        return quality === ConnectionQuality.Poor ? "poor" : null
      })
    }

    room.on(RoomEvent.ConnectionStateChanged, handleStateChange)
    room.on(RoomEvent.ConnectionQualityChanged, handleQuality)
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleStateChange)
      room.off(RoomEvent.ConnectionQualityChanged, handleQuality)
    }
  }, [room])

  return state
}
