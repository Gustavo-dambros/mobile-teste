"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"

export function MobileBackHeader() {
  const router = useRouter()

  return (
    <header className="flex h-12 shrink-0 items-center border-b md:hidden">
      <div className="flex w-full items-center px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
          className="h-10 w-10"
        >
          <motion.div whileTap={{ scale: 0.85 }}>
            <ArrowLeft className="h-5 w-5" />
          </motion.div>
        </Button>
      </div>
    </header>
  )
}
