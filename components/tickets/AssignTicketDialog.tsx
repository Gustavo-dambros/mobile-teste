"use client"

import * as React from "react"
import { toast } from "sonner"

import type { Ticket } from "@/components/tickets/types"
import { useTickets } from "@/lib/tickets/store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface StaffMember {
  id: string
  name: string
  sector: string
}

export function AssignTicketDialog({
  ticket,
  onOpenChange,
}: {
  ticket: Ticket | null
  onOpenChange: (open: boolean) => void
}) {
  const { updateTicket } = useTickets()
  const [members, setMembers] = React.useState<StaffMember[]>([])

  React.useEffect(() => {
    if (!ticket) return
    let cancelled = false
    fetch(`/api/tickets/staff?sector=${ticket.sector}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMembers(data.staff ?? [])
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [ticket])

  async function handleAssign(member: StaffMember) {
    if (!ticket) return
    const ok = await updateTicket(ticket.id, { assigneeId: member.id })
    if (!ok) return
    toast.success(`Chamado atribuído para ${member.name}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Atribuir chamado</DialogTitle>
          <DialogDescription>
            Selecione um colaborador do seu setor para assumir este chamado.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {members.length ? (
            members.map((member) => (
              <Button
                key={member.id}
                type="button"
                variant="outline"
                className="justify-start font-normal"
                onClick={() => handleAssign(member)}
              >
                {member.name}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum outro colaborador encontrado no seu setor.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
