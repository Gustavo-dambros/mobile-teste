import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabaseInstance: SupabaseClient | null = null

/** Configuração global compartilhada entre o cliente Supabase e o fetch utility. */
export interface ApiConfig {
  url: string
  anonKey: string
  /** Base URL para as requisições HTTP da API (ex: "http://localhost:3000" ou "https://app.unipar.br"). */
  baseURL?: string
  /** Platform-specific storage adapter para sessão. */
  storage?: {
    getItem: (key: string) => Promise<string | null>
    setItem: (key: string, value: string) => Promise<void>
    removeItem: (key: string) => Promise<void>
  }
}

/** Configuração global armazenada internamente, acessível por getConfig(). */
interface InternalConfig {
  baseURL: string
  supabase: SupabaseClient
}

let _config: InternalConfig | null = null

/**
 * Inicializa (ou retorna o singleton) do cliente Supabase e armazena a
 * configuração global (baseURL, Supabase client).
 *
 * Deve ser chamado UMA VEZ no bootstrap da aplicação (Web ou Mobile).
 */
export function getSupabaseClient(config: ApiConfig): SupabaseClient {
  if (supabaseInstance && _config) return supabaseInstance

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

  _config = {
    baseURL: config.baseURL ?? "",
    supabase: supabaseInstance,
  }

  return supabaseInstance
}

/** Substitui o singleton do Supabase por um cliente já existente. */
export function setSupabaseClient(client: SupabaseClient) {
  supabaseInstance = client
  if (_config) {
    _config.supabase = client
  } else {
    _config = { baseURL: "", supabase: client }
  }
}

/** Retorna o singleton do Supabase. */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance || !_config) {
    throw new Error(
      "Supabase client not initialized. Call getSupabaseClient() or setSupabaseClient() first."
    )
  }
  return supabaseInstance
}

/**
 * Retorna a configuração interna (baseURL + Supabase client).
 * Lança se o cliente ainda não foi inicializado.
 */
export function getConfig(): InternalConfig {
  if (!_config) {
    throw new Error(
      "API config not initialized. Call getSupabaseClient() first."
    )
  }
  return _config
}

/** @deprecated Use `ApiConfig` instead. Mantido para retrocompatibilidade. */
export type SupabaseConfig = ApiConfig
