"use client"

import * as React from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { EllipsisVerticalIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { hoverScaleSm, tapScaleSm, microTap } from "@/lib/motion"
import { useIsMobile } from "@/hooks/use-mobile"
import { useCurrentUser } from "@/lib/current-user/context"
import { useChatInterno } from "@/lib/chat-interno/store"
import type { DirectoryMember } from "@/lib/team/directory"
import { ActivityBadge, PresenceBadge } from "@/components/team/TeamBadges"
import { ReportMemberDialog } from "@/components/team/ReportMemberDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TeamRowActions({ member }: { member: DirectoryMember }) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const { createDmConversation, startCall } = useChatInterno()
  const [reportOpen, setReportOpen] = React.useState(false)

  if (!currentUser || currentUser.id === member.id) return null

  async function handleChat() {
    const result = await createDmConversation(member.id)
    if (!result.ok || !result.conversation) {
      toast.error(result.error ?? "Não foi possível abrir a conversa")
      return
    }
    router.push(`/chat-interno/bate-papo?conversationId=${result.conversation.id}`)
  }

  async function handleCall() {
    const result = await createDmConversation(member.id)
    if (!result.ok || !result.conversation) {
      toast.error(result.error ?? "Não foi possível iniciar a chamada")
      return
    }
    const callResult = await startCall(result.conversation.id, "audio")
    if (!callResult.ok) {
      toast.error(callResult.error ?? "Não foi possível iniciar a chamada")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-open:bg-muted"
              size="icon"
            />
          }
        >
          <EllipsisVerticalIcon />
          <span className="sr-only">Abrir menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={handleChat}>Bate-papo</DropdownMenuItem>
          <DropdownMenuItem onClick={handleCall}>Ligar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setReportOpen(true)}>
            Denunciar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportMemberDialog
        member={reportOpen ? member : null}
        onOpenChange={setReportOpen}
      />
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function TeamMemberViewer({ item }: { item: DirectoryMember }) {
  const isMobile = useIsMobile()
  const reduced = useReducedMotion()
  return (
    <Drawer swipeDirection={isMobile ? "down" : "right"}>
      <DrawerTrigger
        render={
          <Button
            variant="link"
            className="w-fit px-0 text-left text-foreground"
          />
        }
      >
        {item.name}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <DrawerDescription>Informações do colaborador</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <InfoRow label="E-mail" value={item.email} />
          <InfoRow label="Telefone" value={item.phone || "—"} />
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Setor" value={<Badge variant="outline">{item.sector}</Badge>} />
            <InfoRow
              label="Status"
              value={
                <Badge variant={item.role === "Admin" ? "default" : "outline"} className="px-1.5">
                  {item.role === "Admin" && <ShieldCheckIcon />}
                  {item.role}
                  {item.isSectorLeader && " · Líder do setor"}
                </Badge>
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Presença" value={<PresenceBadge presence={item.presence} />} />
            <InfoRow label="Atividade" value={<ActivityBadge activity={item.activity} />} />
          </div>
        </div>
        <DrawerFooter>
          <motion.div
            whileHover={reduced ? undefined : hoverScaleSm}
            whileTap={reduced ? undefined : tapScaleSm}
            transition={microTap(reduced)}
          >
            <DrawerClose render={<Button variant="outline" className="w-full" />}>
              Fechar
            </DrawerClose>
          </motion.div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
