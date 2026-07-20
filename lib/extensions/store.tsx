"use client"

import * as React from "react"

export interface Extension {
  id: string
  name: string
  sector?: string
  number: string
  createdAt: string
}

export interface ActionResult {
  ok: boolean
  error?: string
}

interface ExtensionsContextValue {
  extensions: Extension[]
  loadExtensions: () => Promise<void>
  createExtension: (input: {
    name: string
    sector?: string
    number: string
  }) => Promise<ActionResult & { extension?: Extension }>
  updateExtension: (
    id: string,
    changes: { name?: string; sector?: string; number?: string }
  ) => Promise<ActionResult>
  deleteExtension: (id: string) => Promise<ActionResult>
}

const ExtensionsContext = React.createContext<ExtensionsContextValue | null>(null)

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Erro inesperado")
  return data as T
}

export function ExtensionsProvider({ children }: { children: React.ReactNode }) {
  const [extensions, setExtensions] = React.useState<Extension[]>([])

  const loadExtensions = React.useCallback(async () => {
    try {
      const data = await api<{ extensions: Extension[] }>("/api/extensions")
      setExtensions(data.extensions)
    } catch {
      // silent — page shows whatever it last had
    }
  }, [])

  React.useEffect(() => {
    const timeout = window.setTimeout(loadExtensions, 0)
    return () => window.clearTimeout(timeout)
  }, [loadExtensions])

  const createExtension = React.useCallback(
    async (input: { name: string; sector?: string; number: string }) => {
      try {
        const data = await api<{ extension: Extension }>("/api/extensions", {
          method: "POST",
          body: JSON.stringify(input),
        })
        setExtensions((prev) =>
          [...prev, data.extension].sort((a, b) =>
            (a.sector ?? "").localeCompare(b.sector ?? "") || a.name.localeCompare(b.name)
          )
        )
        return { ok: true, extension: data.extension }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const updateExtension = React.useCallback(
    async (id: string, changes: { name?: string; sector?: string; number?: string }) => {
      try {
        const data = await api<{ extension: Extension }>(`/api/extensions/${id}`, {
          method: "PATCH",
          body: JSON.stringify(changes),
        })
        setExtensions((prev) => prev.map((e) => (e.id === id ? data.extension : e)))
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
      }
    },
    []
  )

  const deleteExtension = React.useCallback(async (id: string) => {
    try {
      await api(`/api/extensions/${id}`, { method: "DELETE" })
      setExtensions((prev) => prev.filter((e) => e.id !== id))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
    }
  }, [])

  const value = React.useMemo<ExtensionsContextValue>(
    () => ({ extensions, loadExtensions, createExtension, updateExtension, deleteExtension }),
    [extensions, loadExtensions, createExtension, updateExtension, deleteExtension]
  )

  return <ExtensionsContext.Provider value={value}>{children}</ExtensionsContext.Provider>
}

export function useExtensions() {
  const ctx = React.useContext(ExtensionsContext)
  if (!ctx) {
    throw new Error("useExtensions must be used within an ExtensionsProvider")
  }
  return ctx
}
