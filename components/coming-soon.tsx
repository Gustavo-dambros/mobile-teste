"use client"

import { motion, useReducedMotion } from "motion/react"
import { ConstructionIcon } from "lucide-react"

import { fadeIn } from "@/lib/motion"

export function ComingSoon({ label }: { label: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={fadeIn(reduced, 0.1)}
      initial="hidden"
      animate="show"
      className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center lg:px-6"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <ConstructionIcon className="size-5 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">{label}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Esta página está em desenvolvimento.
      </p>
    </motion.div>
  )
}
