"use client"

import { useRouter } from "next/navigation"
import { User } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const router = useRouter()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center border-b">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/perfil")}
          className="h-12 w-12"
        >
          <User className="h-6 w-6" />
        </Button>
      </div>
    </header>
  )
}
