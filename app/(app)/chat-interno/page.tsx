"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import ComunicacaoPage from "./comunicacao-page"

export default function Page() {
  const router = useRouter()
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  React.useEffect(() => {
    if (!isMobile) {
      router.replace("/chat-interno/bate-papo")
    }
  }, [isMobile, router])

  if (!isMobile) return null

  return <ComunicacaoPage />
}
