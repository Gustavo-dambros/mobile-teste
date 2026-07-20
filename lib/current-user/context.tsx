"use client"

import * as React from "react"

import type { SessionUser } from "@/lib/session"

const CurrentUserContext = React.createContext<SessionUser | null | undefined>(undefined)

export function CurrentUserProvider({
  user,
  children,
}: {
  user: SessionUser | null
  children: React.ReactNode
}) {
  return (
    <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const ctx = React.useContext(CurrentUserContext)
  if (ctx === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider")
  }
  return ctx
}
