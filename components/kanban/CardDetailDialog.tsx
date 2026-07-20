"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  ArchiveIcon,
  BoldIcon,
  CheckCircle2Icon,
  CodeIcon,
  EyeIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  PaletteIcon,
  PencilLineIcon,
  QuoteIcon,
  RotateCcwIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/tickets/format"
import { SWATCH_PALETTE } from "@/lib/kanban/constants"
import { applyFormatting, FORMAT_ACTIONS, renderSafeMarkdown } from "@/lib/kanban/markdown"
import { useKanban } from "@/lib/kanban/store"
import { CardActionsMenu } from "@/components/kanban/CardActionsMenu"
import { DueDatePicker } from "@/components/kanban/DueDatePicker"
import { KanbanActivityHistory } from "@/components/kanban/KanbanActivityHistory"
import { KanbanAttachments } from "@/components/kanban/KanbanAttachments"
import { KanbanChecklist } from "@/components/kanban/KanbanChecklist"
import { KanbanComments } from "@/components/kanban/KanbanComments"
import { LabelsPicker } from "@/components/kanban/LabelsPicker"
import { PrioritySelector } from "@/components/kanban/PrioritySelector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const FORMAT_TOOLBAR: { key: keyof typeof FORMAT_ACTIONS; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "bold", icon: BoldIcon },
  { key: "italic", icon: ItalicIcon },
  { key: "heading", icon: Heading2Icon },
  { key: "list", icon: ListIcon },
  { key: "quote", icon: QuoteIcon },
  { key: "code", icon: CodeIcon },
  { key: "link", icon: LinkIcon },
]

// Keyed by cardId at the call site so switching cards remounts this editor
// with fresh local state — no effect needed to re-sync `value` from props.
function DescriptionEditor({ cardId, description }: { cardId: string; description: string }) {
  const { updateCardDescription } = useKanban()
  const [value, setValue] = React.useState(description)
  const [preview, setPreview] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  function handleBlur() {
    if (value !== description) updateCardDescription(cardId, value)
  }

  function applyAction(key: keyof typeof FORMAT_ACTIONS) {
    const textarea = textareaRef.current
    if (!textarea) return
    const result = applyFormatting(value, textarea.selectionStart, textarea.selectionEnd, FORMAT_ACTIONS[key])
    setValue(result.value)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {FORMAT_TOOLBAR.map(({ key, icon: Icon }) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => applyAction(key)}
              disabled={preview}
            >
              <Icon />
              <span className="sr-only">{FORMAT_ACTIONS[key].label}</span>
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => setPreview((p) => !p)}>
          {preview ? <PencilLineIcon /> : <EyeIcon />}
          <span className="sr-only">{preview ? "Editar" : "Pré-visualizar"}</span>
        </Button>
      </div>
      {preview ? (
        <div className="min-h-24 rounded-lg border p-2.5">
          {value.trim() ? renderSafeMarkdown(value) : <p className="text-sm text-muted-foreground">Sem descrição.</p>}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="Adicione uma descrição mais detalhada..."
          rows={5}
        />
      )}
    </div>
  )
}

function CoverPicker({ cardId, coverType, coverValue }: { cardId: string; coverType: string; coverValue?: string }) {
  const { setCover } = useKanban()
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <PaletteIcon data-icon="inline-start" />
        Capa
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <p className="px-1 text-xs font-medium text-muted-foreground">Capa do cartão</p>
        <div className="flex flex-wrap gap-1.5">
          {SWATCH_PALETTE.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setCover(cardId, "color", swatch)}
              aria-label={`Capa cor ${swatch}`}
              className={cn(
                "size-6 rounded-md ring-2 ring-transparent ring-offset-1 ring-offset-popover",
                coverType === "color" && coverValue === swatch && "ring-foreground"
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
        <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => setCover(cardId, "none")}>
          Remover capa
        </Button>
        <p className="px-1 text-xs text-muted-foreground">
          Para usar uma imagem como capa, marque-a com a estrela na aba Anexos.
        </p>
      </PopoverContent>
    </Popover>
  )
}

export function CardDetailDialog({
  cardId,
  onOpenChange,
}: {
  cardId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const { getCard, columnsForBoard, updateCardTitle, moveCard, completeCard, reopenCard, archiveCard, setPriority } =
    useKanban()
  const card = cardId ? getCard(cardId) : undefined
  const [title, setTitle] = React.useState(card?.title ?? "")

  // Reset the local title draft whenever a different card opens, without an
  // effect — plain render-time state adjustment (React's documented
  // "adjusting state when a prop changes" pattern).
  const [lastCardId, setLastCardId] = React.useState(cardId)
  if (cardId !== lastCardId) {
    setLastCardId(cardId)
    setTitle(card?.title ?? "")
  }

  if (!card) return null

  const columns = columnsForBoard(card.boardId)

  function handleTitleBlur() {
    if (!card) return
    if (!title.trim()) {
      setTitle(card.title)
      return
    }
    if (title.trim() !== card.title) updateCardTitle(card.id, title)
  }

  async function handleMoveColumn(columnId: string) {
    if (!card || columnId === card.columnId) return
    const result = await moveCard(card.id, columnId, null, null)
    if (!result.ok) toast.error(result.error ?? "Não foi possível mover a atividade")
  }

  async function handleToggleComplete() {
    if (!card) return
    const result = card.completedAt ? await reopenCard(card.id) : await completeCard(card.id)
    if (!result.ok) toast.error(result.error ?? "Não foi possível atualizar a atividade")
    else toast.success(card.completedAt ? "Atividade reaberta" : "Atividade concluída")
  }

  async function handleArchive() {
    if (!card) return
    const result = await archiveCard(card.id)
    if (result.ok) {
      toast.success("Atividade arquivada")
      onOpenChange(false)
    } else {
      toast.error(result.error ?? "Não foi possível arquivar")
    }
  }

  return (
    <Dialog open={!!cardId} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">{card.title}</DialogTitle>
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
              aria-label="Título da atividade"
            />
            <p className="text-xs text-muted-foreground">
              Criada em {formatDate(card.createdAt)} · Atualizada em {formatDate(card.updatedAt)}
              {card.completedAt && ` · Concluída em ${formatDate(card.completedAt)}`}
            </p>
          </div>
          <CardActionsMenu card={card} columns={columns} onOpen={() => {}} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <Select value={card.columnId} onValueChange={(v) => v && handleMoveColumn(v)} items={columns.map((c) => ({ value: c.id, label: c.title }))}>
            <SelectTrigger size="sm" aria-label="Coluna atual">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <PrioritySelector value={card.priority} onChange={(p) => setPriority(card.id, p)} />
          <DueDatePicker card={card} />
          <LabelsPicker card={card} />
          <CoverPicker cardId={card.id} coverType={card.coverType} coverValue={card.coverValue} />
          <Button
            type="button"
            variant={card.completedAt ? "outline" : "default"}
            size="sm"
            onClick={handleToggleComplete}
          >
            {card.completedAt ? <RotateCcwIcon data-icon="inline-start" /> : <CheckCircle2Icon data-icon="inline-start" />}
            {card.completedAt ? "Reabrir" : "Marcar como concluída"}
          </Button>
          {card.completedAt && (
            <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3" />
              Concluída
            </Badge>
          )}
          <Button type="button" variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={handleArchive}>
            <ArchiveIcon data-icon="inline-start" />
            Arquivar
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="atividade">
            <TabsList>
              <TabsTrigger value="atividade">Atividade</TabsTrigger>
              <TabsTrigger value="anexos">Anexos</TabsTrigger>
              <TabsTrigger value="comentarios">Comentários</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="atividade" className="flex flex-col gap-5 pt-4">
              <div>
                <h4 className="mb-1.5 text-sm font-medium">Descrição</h4>
                <DescriptionEditor key={card.id} cardId={card.id} description={card.description ?? ""} />
              </div>
              <div>
                <h4 className="mb-1.5 text-sm font-medium">Checklists</h4>
                <KanbanChecklist card={card} />
              </div>
            </TabsContent>
            <TabsContent value="anexos" className="pt-4">
              <KanbanAttachments card={card} />
            </TabsContent>
            <TabsContent value="comentarios" className="pt-4">
              <KanbanComments card={card} />
            </TabsContent>
            <TabsContent value="historico" className="pt-4">
              <KanbanActivityHistory card={card} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
