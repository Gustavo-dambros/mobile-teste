"use client"

import * as React from "react"
import { PhoneIcon } from "lucide-react"

import { useExtensions } from "@/lib/extensions/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function RamalList() {
  const { extensions } = useExtensions()

  const groups = React.useMemo(() => {
    const map = new Map<string, typeof extensions>()
    for (const extension of extensions) {
      const key = extension.sector ?? "Sem setor"
      map.set(key, [...(map.get(key) ?? []), extension])
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [extensions])

  if (extensions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <PhoneIcon className="size-8" />
        <p className="text-sm">Nenhum ramal cadastrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-6">
      {groups.map(([sector, items]) => (
        <Card key={sector}>
          <CardHeader>
            <CardTitle className="text-base">{sector}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {items.map((extension) => (
              <div key={extension.id} className="flex items-center justify-between py-2">
                <span className="text-sm">{extension.name}</span>
                <span className="font-mono text-sm text-muted-foreground">{extension.number}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
