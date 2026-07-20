"use client"

import { RouteError } from "@/components/route-error"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError title="Chat Interno" reset={reset} />
}
