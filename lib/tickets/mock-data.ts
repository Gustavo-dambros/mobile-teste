import type { TicketPriority, TicketSector, TicketStatus } from "@/components/tickets/types"

export const sectorItems: { label: string; value: TicketSector }[] = [
  { label: "SP-Suporte Técnico", value: "SP-Suporte Técnico" },
  { label: "RH-Recursos Humanos", value: "RH-Recursos Humanos" },
  { label: "ADM-Administração", value: "ADM-Administração" },
  { label: "SEP-Serviços Escola Psicologia", value: "SEP-Serviços Escola Psicologia" },
]

export const priorityItems: { label: string; value: TicketPriority }[] = [
  { label: "Alta", value: "Alta" },
  { label: "Média", value: "Média" },
  { label: "Baixa", value: "Baixa" },
]

export const statusItems: { label: string; value: TicketStatus }[] = [
  { label: "Aberto", value: "Aberto" },
  { label: "Em andamento", value: "Em andamento" },
  { label: "Concluído", value: "Concluído" },
]
