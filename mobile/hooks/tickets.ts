import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query"
import type { Ticket } from "@unipar/types"
import {
  fetchTickets,
  fetchTicket,
  createTicket,
  closeTicket,
  reopenTicket,
  deleteTicket,
  rateTicket,
  ApiAuthError,
} from "@unipar/api"

export const ticketsKeys = {
  all: ["tickets"] as const,
  list: ["tickets", "list"] as const,
  detail: (id: string) => ["tickets", "detail", id] as const,
}

export type CreateTicketInput = Parameters<typeof createTicket>[0]

export function useTicketsQuery(): UseQueryResult<Ticket[], unknown> {
  return useQuery({
    queryKey: ticketsKeys.list,
    queryFn: fetchTickets,
  })
}

export function useTicketQuery(id: string | undefined): UseQueryResult<Ticket | undefined> {
  return useQuery({
    queryKey: id ? ticketsKeys.detail(id) : ["tickets", "detail", undefined],
    queryFn: () => (id ? fetchTicket(id) : Promise.resolve(undefined as unknown as Ticket)),
    enabled: !!id,
  })
}

export function useCreateTicketMutation(): UseMutationResult<
  Ticket,
  unknown,
  CreateTicketInput
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => createTicket(data),
    onSuccess: (ticket) => {
      qc.setQueryData<Ticket[]>(ticketsKeys.list, (old = []) => [ticket, ...old])
    },
  })
}

export function useCloseTicketMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => closeTicket(id, reason),
    onSettled: () => qc.invalidateQueries({ queryKey: ticketsKeys.all }),
  })
}

export function useReopenTicketMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reopenTicket(id, reason),
    onSettled: () => qc.invalidateQueries({ queryKey: ticketsKeys.all }),
  })
}

export function useDeleteTicketMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deleteTicket(id, reason),
    onSuccess: (_, { id }) => {
      qc.setQueryData<Ticket[]>(ticketsKeys.list, (old = []) =>
        old.filter((t) => t.id !== id)
      )
    },
  })
}

export function useRateTicketMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      rating,
      comment,
    }: {
      id: string
      rating: number
      comment?: string
    }) => rateTicket(id, rating, comment),
    onSettled: (_d, _e, { id }) =>
      qc.invalidateQueries({ queryKey: ticketsKeys.detail(id) }),
  })
}

export { ApiAuthError }
