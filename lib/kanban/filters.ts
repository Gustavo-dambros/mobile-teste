"use client"

import * as React from "react"

import type {
  CardPriority,
  KanbanAttachment,
  KanbanCard,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanLabel,
} from "@/components/kanban/types"
import { isOverdue } from "@/lib/kanban/notifications"

export type DueFilter =
  | "overdue"
  | "today"
  | "tomorrow"
  | "week"
  | "month"
  | "none"
  | "custom"

export interface KanbanFilters {
  search: string
  columnId: string | null
  priority: CardPriority | null
  labelId: string | null
  due: DueFilter | null
  dueStart: string | null
  dueEnd: string | null
  completed: boolean
  overdue: boolean
  noDueDate: boolean
  hasAttachments: boolean
  hasChecklist: boolean
}

export const DEFAULT_KANBAN_FILTERS: KanbanFilters = {
  search: "",
  columnId: null,
  priority: null,
  labelId: null,
  due: null,
  dueStart: null,
  dueEnd: null,
  completed: false,
  overdue: false,
  noDueDate: false,
  hasAttachments: false,
  hasChecklist: false,
}

export function countActiveFilters(filters: KanbanFilters): number {
  let count = 0
  if (filters.columnId) count++
  if (filters.priority) count++
  if (filters.labelId) count++
  if (filters.due) count++
  if (filters.completed) count++
  if (filters.overdue) count++
  if (filters.noDueDate) count++
  if (filters.hasAttachments) count++
  if (filters.hasChecklist) count++
  return count
}

export function useKanbanFiltersState() {
  const [filters, setFilters] = React.useState<KanbanFilters>(DEFAULT_KANBAN_FILTERS)
  const clearFilters = React.useCallback(() => setFilters(DEFAULT_KANBAN_FILTERS), [])
  return { filters, setFilters, clearFilters }
}

function startOfDay(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(offsetDays = 0) {
  const d = startOfDay(offsetDays)
  d.setHours(23, 59, 59, 999)
  return d
}

function matchesDueBucket(card: KanbanCard, bucket: DueFilter): boolean {
  if (bucket === "none") return !card.dueAt
  if (!card.dueAt) return false
  const due = new Date(card.dueAt)
  switch (bucket) {
    case "overdue":
      return isOverdue(card)
    case "today":
      return due >= startOfDay(0) && due <= endOfDay(0)
    case "tomorrow":
      return due >= startOfDay(1) && due <= endOfDay(1)
    case "week":
      return due >= startOfDay(0) && due <= endOfDay(7)
    case "month":
      return due >= startOfDay(0) && due <= endOfDay(30)
    default:
      return true
  }
}

function matchesSearch(haystack: (string | undefined)[], query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return haystack.some((value) => value?.toLowerCase().includes(q))
}

export function filterCards(
  cards: KanbanCard[],
  filters: KanbanFilters,
  ctx: {
    getLabel: (id: string) => KanbanLabel | undefined
    getChecklistsForCard: (cardId: string) => KanbanChecklist[]
    getChecklistItems: (checklistId: string) => KanbanChecklistItem[]
    getAttachmentsForCard: (cardId: string) => KanbanAttachment[]
  }
): KanbanCard[] {
  return cards.filter((card) => {
    if (card.archivedAt) return false
    if (filters.columnId && card.columnId !== filters.columnId) return false
    if (filters.priority && card.priority !== filters.priority) return false
    if (filters.labelId && !card.labelIds.includes(filters.labelId)) return false
    if (filters.completed && !card.completedAt) return false
    if (filters.overdue && !isOverdue(card)) return false
    if (filters.noDueDate && card.dueAt) return false
    const cardAttachments = ctx.getAttachmentsForCard(card.id)
    if (filters.hasAttachments && cardAttachments.length === 0) return false
    const cardChecklists = ctx.getChecklistsForCard(card.id)
    if (filters.hasChecklist && cardChecklists.length === 0) return false
    if (filters.due) {
      if (filters.due === "custom") {
        if (!card.dueAt) return false
        if (filters.dueStart && card.dueAt < filters.dueStart) return false
        if (filters.dueEnd && card.dueAt > filters.dueEnd) return false
      } else if (!matchesDueBucket(card, filters.due)) {
        return false
      }
    }

    if (filters.search) {
      const cardLabelNames = card.labelIds
        .map((id) => ctx.getLabel(id)?.name)
        .filter(Boolean) as string[]
      const itemTitles = cardChecklists.flatMap((cl) => ctx.getChecklistItems(cl.id)).map((item) => item.title)
      const attachmentNames = cardAttachments.map((a) => a.originalName)
      if (
        !matchesSearch(
          [card.title, card.description, ...cardLabelNames, ...itemTitles, ...attachmentNames],
          filters.search
        )
      ) {
        return false
      }
    }

    return true
  })
}
