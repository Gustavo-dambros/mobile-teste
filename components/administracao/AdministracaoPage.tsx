"use client"

import { motion, useReducedMotion } from "motion/react"

import { adminPageReveal } from "@/lib/motion"
import { isAdmin } from "@/lib/session"
import { useCurrentUser } from "@/lib/current-user/context"
import { useAdministracao } from "@/lib/administracao/store"
import { AccessDeniedState } from "@/components/administracao/AccessDeniedState"
import { UserCreationSection } from "@/components/administracao/user-creation/UserCreationSection"
import { ExtensionsSection } from "@/components/administracao/ExtensionsSection"
import { ReportedMessagesSection } from "@/components/administracao/ReportedMessagesSection"
import { ReportedMembersSection } from "@/components/administracao/ReportedMembersSection"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AdministracaoPage() {
  const reduced = useReducedMotion()
  const currentUser = useCurrentUser()
  const { pendingCount } = useAdministracao()

  if (!isAdmin(currentUser)) {
    return <AccessDeniedState />
  }

  return (
    <motion.div
      variants={adminPageReveal(reduced)}
      initial="hidden"
      animate="show"
      className="flex h-full min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <Tabs defaultValue="criacao-usuarios" className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="criacao-usuarios" className="gap-2">
            Criação de Usuários
            {pendingCount > 0 && (
              <Badge variant="destructive" className="size-4 rounded-full px-1 tabular-nums">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ramais">Ramais</TabsTrigger>
          <TabsTrigger value="denuncias">Denúncias</TabsTrigger>
        </TabsList>
        <TabsContent value="criacao-usuarios" className="flex min-h-0 flex-1 flex-col">
          <UserCreationSection />
        </TabsContent>
        <TabsContent value="ramais" className="flex min-h-0 flex-1 flex-col">
          <ExtensionsSection />
        </TabsContent>
        <TabsContent value="denuncias" className="flex min-h-0 flex-1 flex-col">
          <Tabs defaultValue="mensagens" className="flex min-h-0 flex-1 flex-col gap-3">
            <TabsList className="w-fit">
              <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
              <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
            </TabsList>
            <TabsContent value="mensagens" className="flex min-h-0 flex-1 flex-col">
              <ReportedMessagesSection />
            </TabsContent>
            <TabsContent value="colaboradores" className="flex min-h-0 flex-1 flex-col">
              <ReportedMembersSection />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
