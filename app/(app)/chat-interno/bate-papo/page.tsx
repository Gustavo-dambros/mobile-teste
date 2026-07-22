"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { ChatInternoShell } from "@/components/chat-interno/ChatInternoShell"
import BatePapoMobilePage from "./mobile-page"

export default function Page() {
  const router = useRouter()
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  if (isMobile) {
    return <BatePapoMobilePage />
  }

  return (
    <DashboardShell>
      <ChatInternoShell scope="dm" />
    </DashboardShell>
  )
}
