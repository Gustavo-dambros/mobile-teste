import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabaseInstance: SupabaseClient | null = null

export interface SupabaseConfig {
  url: string
  anonKey: string
  /** Platform-specific storage adapter */
  storage?: {
    getItem: (key: string) => Promise<string | null>
    setItem: (key: string, value: string) => Promise<void>
    removeItem: (key: string) => Promise<void>
  }
}

export function getSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (supabaseInstance) return supabaseInstance

  supabaseInstance = createClient(config.url, config.anonKey, {
    auth: config.storage
      ? {
          storage: config.storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }
      : undefined,
  })

  return supabaseInstance
}

export function setSupabaseClient(client: SupabaseClient) {
  supabaseInstance = client
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error("Supabase client not initialized. Call getSupabaseClient() or setSupabaseClient() first.")
  }
  return supabaseInstance
}
