"use client"

import { usePathname } from "next/navigation"
import { MobileBackHeader } from "@/components/mobile-back-header"

export function BackHeaderWrapper() {
  const pathname = usePathname()

  if (pathname === "/dashboard" || pathname === "/") return null

  return <MobileBackHeader />
}
