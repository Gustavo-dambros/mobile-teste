"use client"

import { useRouter, usePathname } from "next/navigation"
import { User, ArrowLeft } from "lucide-react"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const isDashboard = pathname === "/dashboard" || pathname === "/"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center border-b">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        {!isDashboard && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="h-12 w-12 md:hidden"
          >
            <motion.div whileTap={{ scale: 0.85 }}>
              <ArrowLeft className="h-6 w-6" />
            </motion.div>
          </Button>
        )}
        <div className="flex-1" />
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
