"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"

import { RecoverAccountForm } from "@/components/recover-account-form"
import { loginCard, loginLogo } from "@/lib/motion"

export default function RecoverAccountPage() {
  const reduced = useReducedMotion()

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <motion.div
        variants={loginLogo(reduced)}
        initial="hidden"
        animate="show"
        className="absolute top-6 left-6 flex size-8 items-center justify-center md:top-10 md:left-10"
      >
        <Image
          src="/logo.png"
          alt="Unipar"
          width={32}
          height={32}
          className="size-full object-contain"
          priority
        />
      </motion.div>
      <motion.div
        variants={loginCard(reduced)}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm md:max-w-4xl"
      >
        <RecoverAccountForm />
      </motion.div>
    </div>
  )
}
