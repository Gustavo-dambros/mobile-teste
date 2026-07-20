"use client"

import * as React from "react"

import { createClient } from "@/lib/supabase/client"

const SEND_TIMEOUT_MS = 4000

/**
 * Shared plumbing for a single named Supabase Realtime broadcast channel — before
 * this existed, reunioes/chat-interno/atividades-setor/tickets each hand-rolled their
 * own copy of this exact client-singleton/join-promise/send-with-timeout logic. That
 * duplication is exactly how the same "leaks full content over an unauthenticated
 * global channel" bug ended up copy-pasted into all four modules — fixed individually
 * afterwards, but this file is what stops a fifth module from reintroducing it.
 *
 * IMPORTANT: broadcast payloads on any channel created here are visible to anyone
 * holding the app's public anon key (i.e. anyone logged into the app) — there is no
 * per-resource authorization at the channel level. Never put confidential content
 * (message text, names, descriptions...) in a payload; send an id/pointer instead and
 * have the listener re-fetch over an authenticated REST route.
 */
export function createBroadcastChannel(channelName: string) {
  const supabase = createClient()
  let sendChannel: ReturnType<typeof supabase.channel> | null = null
  let joinPromise: Promise<boolean> | null = null

  function getSendChannel() {
    if (!sendChannel) sendChannel = supabase.channel(channelName)
    return sendChannel
  }

  function ensureJoined(): Promise<boolean> {
    if (joinPromise) return joinPromise
    const channel = getSendChannel()
    joinPromise = new Promise<boolean>((resolve) => {
      channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          resolve(true)
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (err) console.error(`[${channelName}] send channel join failed`, status, err)
          joinPromise = null // allow a fresh attempt on the next send
          resolve(false)
        }
      })
    })
    return joinPromise
  }

  async function send(event: string, payload: unknown) {
    const joined = await Promise.race([
      ensureJoined(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), SEND_TIMEOUT_MS)),
    ])
    if (!joined) return

    try {
      await getSendChannel().send({ type: "broadcast", event, payload })
    } catch (error) {
      console.error(`[${channelName}] broadcast send failed`, error)
    }
  }

  /** Subscribes one Supabase channel for the calling component's lifetime, wiring one
   * `.on("broadcast")` listener per key in `handlers` (event name -> callback). Each
   * callback is ref-wrapped internally, so passing fresh inline functions every render
   * is fine and won't tear down/recreate the subscription — only the *set* of event
   * names (handlers.length) does, since that changes what the channel listens for. */
  function useSubscription(handlers: Record<string, (payload: unknown) => void>) {
    const handlersRef = React.useRef(handlers)
    React.useLayoutEffect(() => {
      handlersRef.current = handlers
    })

    const events = Object.keys(handlers).sort().join(",")

    React.useEffect(() => {
      let channel = supabase.channel(channelName)
      for (const event of events.split(",")) {
        if (!event) continue
        channel = channel.on("broadcast", { event }, ({ payload }: { payload: unknown }) => {
          handlersRef.current[event]?.(payload)
        })
      }
      channel.subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[${channelName}] subscribe failed`, status, err)
        }
      })

      return () => {
        supabase.removeChannel(channel)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events])
  }

  return { send, useSubscription }
}
