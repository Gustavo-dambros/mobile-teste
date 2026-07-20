"use client"

import { motion, useReducedMotion } from "motion/react"

import { typingDotPulse } from "@/lib/motion"

export function TypingIndicator({ label }: { label?: string }) {
  const reduced = useReducedMotion()
  return (
    <div className="flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground">
      {label && <span>{label}</span>}
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            variants={typingDotPulse(reduced, i)}
            initial="hidden"
            animate="show"
            className="size-1.5 rounded-full bg-muted-foreground"
          />
        ))}
      </div>
    </div>
  )
}
