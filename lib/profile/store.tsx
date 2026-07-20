"use client"

import * as React from "react"

import type {
  EditableProfileFields,
  PresenceStatus,
  PublicProfile,
  UserProfile,
  WorkActivityStatus,
} from "@/components/profile/types"
import { toPublicProfile } from "@/components/profile/types"
import { statusMessageSchema } from "@/components/profile/types"
import { INITIAL_PROFILE } from "@/lib/profile/mock-data"
import { useCurrentUser } from "@/lib/current-user/context"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import { ACTIVITY_LABEL, PRESENCE_LABEL } from "@/lib/team/presence-labels"
import { broadcastTeamPresenceUpdate } from "@/lib/team/presence-realtime"

interface ProfileState {
  profile: UserProfile
  isModalOpen: boolean
}

type Action =
  | { type: "UPDATE_PROFILE"; changes: EditableProfileFields; updatedAt: string }
  | { type: "OPEN_MODAL" }
  | { type: "CLOSE_MODAL" }

function reducer(state: ProfileState, action: Action): ProfileState {
  switch (action.type) {
    case "UPDATE_PROFILE":
      return {
        ...state,
        profile: {
          ...state.profile,
          ...action.changes,
          profileUpdatedAt: action.updatedAt,
          lastSeenAt: action.updatedAt,
        },
      }
    case "OPEN_MODAL":
      return { ...state, isModalOpen: true }
    case "CLOSE_MODAL":
      return { ...state, isModalOpen: false }
    default:
      return state
  }
}

interface UpdateProfileResult {
  ok: boolean
  error?: string
}

interface ProfileContextValue {
  profile: UserProfile
  isModalOpen: boolean
  openProfileModal: () => void
  closeProfileModal: () => void
  updateProfile: (changes: EditableProfileFields) => Promise<UpdateProfileResult>
  getPublicProfile: (userId: string) => PublicProfile | undefined
}

const ProfileContext = React.createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser()
  const roster = useChatRoster()
  const [state, dispatch] = React.useReducer(reducer, undefined, () => ({
    profile: currentUser
      ? {
          ...INITIAL_PROFILE,
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          phone: currentUser.phone,
          sector: currentUser.sector,
          cpf: currentUser.cpf,
          presenceStatus: currentUser.presenceStatus as PresenceStatus,
          workActivityStatus: currentUser.workActivityStatus as WorkActivityStatus,
          statusMessage: currentUser.statusMessage,
        }
      : INITIAL_PROFILE,
    isModalOpen: false,
  }))

  const openProfileModal = React.useCallback(() => dispatch({ type: "OPEN_MODAL" }), [])
  const closeProfileModal = React.useCallback(() => dispatch({ type: "CLOSE_MODAL" }), [])

  const updateProfile = React.useCallback(
    async (changes: EditableProfileFields): Promise<UpdateProfileResult> => {
      const messageCheck = statusMessageSchema.safeParse(changes.statusMessage)
      if (!messageCheck.success) {
        return { ok: false, error: messageCheck.error.issues[0]?.message ?? "Recado inválido." }
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presenceStatus: changes.presenceStatus,
          workActivityStatus: changes.workActivityStatus,
          statusMessage: messageCheck.data,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { ok: false, error: data.error ?? "Não foi possível salvar as alterações." }
      }

      dispatch({
        type: "UPDATE_PROFILE",
        changes: { ...changes, statusMessage: messageCheck.data },
        updatedAt: new Date().toISOString(),
      })

      void broadcastTeamPresenceUpdate({
        id: state.profile.id,
        presence: PRESENCE_LABEL[changes.presenceStatus],
        activity: ACTIVITY_LABEL[changes.workActivityStatus],
      })

      return { ok: true }
    },
    [state.profile.id]
  )

  const getPublicProfile = React.useCallback(
    (userId: string): PublicProfile | undefined => {
      if (userId === state.profile.id) return toPublicProfile(state.profile)
      // Cross-feature id namespaces aren't unified yet (see lib/session.ts) —
      // fall back to the real roster for a minimal public profile until
      // every feature shares one identity source.
      const member = roster.find((m) => m.id === userId)
      if (!member) return undefined
      return {
        id: userId,
        name: member.name,
        sector: member.sector,
        avatarUrl: null,
        presenceStatus: "OFFLINE",
        workActivityStatus: "UNAVAILABLE",
        statusMessage: "",
        lastSeenAt: new Date().toISOString(),
      }
    },
    [state.profile, roster]
  )

  const value = React.useMemo<ProfileContextValue>(
    () => ({
      profile: state.profile,
      isModalOpen: state.isModalOpen,
      openProfileModal,
      closeProfileModal,
      updateProfile,
      getPublicProfile,
    }),
    [state.profile, state.isModalOpen, openProfileModal, closeProfileModal, updateProfile, getPublicProfile]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = React.useContext(ProfileContext)
  if (!ctx) {
    throw new Error("useProfile must be used within a ProfileProvider")
  }
  return ctx
}
