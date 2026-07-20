"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { ShieldAlertIcon } from "lucide-react"

import { fadeIn } from "@/lib/motion"
import { Button } from "@/components/ui/button"

export function AccessDeniedState() {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={fadeIn(reduced, 0.1)}
      initial="hidden"
      animate="show"
      className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center lg:px-6"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlertIcon className="size-5 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold">Acesso restrito</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Você não tem permissão para acessar a página de Administração. Esse recurso é exclusivo
        para administradores do sistema.
      </p>
      <Button className="mt-2" render={<Link href="/dashboard" />}>
        Voltar para a Dashboard
      </Button>
    </motion.div>
  )
}
