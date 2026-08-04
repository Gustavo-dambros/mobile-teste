import React, { createContext, useContext, useEffect, useState } from "react"
import * as SecureStore from "expo-secure-store"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Chaves que o adapter Supabase grava no SecureStore (SSR + auth keys).
// ponytail: nominal — listar só o prefixo exigiria iterar SecureStore, indisponível na API pública do expo-secure-store.
const SECURE_STORE_KEYS = [
  "sb-sulwgatxneovzvsfbwzt-auth-token",
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return {}
  }

  const signOut = async () => {
    // 1. Avisa o backend para invalidar a sessão (se houver).
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/logout`,
        { method: "POST", credentials: "include" }
      )
    } catch {
      // logout best-effort — sinal de rede não deve bloquear o logout local.
    }
    // 2. Limpa a sessão Supabase em memória.
    await supabase.auth.signOut()
    // 3. Garante remoção dos tokens persistidos no SecureStore.
    await Promise.all(
      SECURE_STORE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => {}))
    )
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
