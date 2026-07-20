"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  AtSignIcon,
  CornerDownRightIcon,
  PaperclipIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"

import { formatDateTime } from "@/lib/tickets/format"
import { useAtividadesSetor } from "@/lib/atividades-setor/store"
import { useCurrentUser } from "@/lib/current-user/context"
import { useChatRoster, useRosterMember } from "@/lib/chat-interno/use-roster"
import {
  ACCEPTED_ATTACHMENT_TYPES,
  filesToAttachments,
  revokeAttachmentUrls,
  validateFile,
} from "@/lib/atividades-setor/upload"
import type { ActivityAttachment, TaskComment } from "@/components/atividades-setor/types"
import { AttachmentPreviewList } from "@/components/atividades-setor/AttachmentPreviewList"
import { UserAvatarBadge } from "@/components/atividades-setor/UserAvatarBadge"
import { UserMultiSelect } from "@/components/atividades-setor/UserMultiSelect"
import { Button } from "@/components/ui/button"
import { NoPermissionState } from "@/components/atividades-setor/StateViews"
import { Textarea } from "@/components/ui/textarea"

/** Resolves a person's display name from the roster, falling back to "me" for the current user (excluded from the roster endpoint). */
function useDisplayName(userId: string): string {
  const currentUser = useCurrentUser()
  const rosterMember = useRosterMember(currentUser?.id === userId ? undefined : userId)
  if (currentUser?.id === userId) return currentUser.name
  return rosterMember?.name ?? "Usuário"
}

function CommentRow({ comment, taskId, isReply }: { comment: TaskComment; taskId: string; isReply: boolean }) {
  const currentUser = useCurrentUser()
  const { editComment, deleteComment } = useAtividadesSetor()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(comment.text)
  const authorName = useDisplayName(comment.authorId)
  const canEdit = comment.authorId === currentUser?.id && !comment.deletedAt

  async function handleSaveEdit() {
    if (!draft.trim()) {
      toast.error("O comentário não pode ficar vazio")
      return
    }
    const result = await editComment(comment.id, taskId, draft.trim())
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível editar o comentário")
      return
    }
    setEditing(false)
  }

  async function handleDelete() {
    const result = await deleteComment(comment.id, taskId)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir o comentário")
      return
    }
    toast.success("Comentário removido")
  }

  return (
    <div className={isReply ? "ml-8 flex gap-2.5" : "flex gap-2.5"}>
      {isReply && <CornerDownRightIcon className="mt-2 size-3.5 shrink-0 text-muted-foreground" />}
      <UserAvatarBadge userId={comment.authorId} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{authorName}</span>
          <span className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
          {comment.editedAt && <span className="text-xs text-muted-foreground">(editado)</span>}
        </div>
        {comment.deletedAt ? (
          <p className="text-sm text-muted-foreground italic">Comentário removido.</p>
        ) : editing ? (
          <div className="flex flex-col gap-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSaveEdit}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">{comment.text}</p>
            {comment.mentionedUserIds.length > 0 && <MentionedNames ids={comment.mentionedUserIds} />}
            {comment.attachments.length > 0 && <AttachmentPreviewList attachments={comment.attachments} />}
          </>
        )}
        {canEdit && !editing && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setDraft(comment.text)
                setEditing(true)
              }}
            >
              <PencilIcon />
              <span className="sr-only">Editar comentário</span>
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" onClick={handleDelete}>
              <Trash2Icon />
              <span className="sr-only">Excluir comentário</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function MentionedNames({ ids }: { ids: string[] }) {
  const roster = useChatRoster()
  const currentUser = useCurrentUser()
  const names = ids
    .map((id) => (id === currentUser?.id ? currentUser.name : roster.find((m) => m.id === id)?.name))
    .filter(Boolean)
  if (names.length === 0) return null
  return <p className="text-xs text-muted-foreground">Mencionou {names.join(", ")}</p>
}

export function CommentThread({ taskId, canComment }: { taskId: string; canComment: boolean }) {
  const { getComments, loadComments, addComment } = useAtividadesSetor()
  const roster = useChatRoster()
  React.useEffect(() => {
    void loadComments(taskId)
  }, [taskId, loadComments])
  const comments = getComments(taskId)
  const [text, setText] = React.useState("")
  const [mentionedUserIds, setMentionedUserIds] = React.useState<string[]>([])
  const [showMentionPicker, setShowMentionPicker] = React.useState(false)
  const [attachments, setAttachments] = React.useState<ActivityAttachment[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    for (const file of picked) {
      const error = validateFile(file)
      if (error) {
        toast.error(error)
        e.target.value = ""
        return
      }
    }
    if (picked.length) {
      setAttachments((prev) => [...prev, ...filesToAttachments(picked)])
    }
    e.target.value = ""
  }

  function handleRemoveAttachment(id: string) {
    const found = attachments.find((a) => a.id === id)
    if (found) revokeAttachmentUrls([found])
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const roots = comments.filter((c) => !c.parentId)
  const repliesByParent = new Map<string, TaskComment[]>()
  for (const c of comments) {
    if (!c.parentId) continue
    const list = repliesByParent.get(c.parentId) ?? []
    list.push(c)
    repliesByParent.set(c.parentId, list)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      toast.error("Escreva um comentário antes de enviar")
      return
    }
    const result = await addComment(taskId, text.trim(), { mentionedUserIds, attachments })
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível comentar")
      return
    }
    setText("")
    setMentionedUserIds([])
    setShowMentionPicker(false)
    setAttachments([])
  }

  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {roots.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-3">
              <CommentRow comment={comment} taskId={taskId} isReply={false} />
              {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                <CommentRow key={reply.id} comment={reply} taskId={taskId} isReply />
              ))}
            </div>
          ))}
        </div>
      )}

      {canComment ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t pt-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário..."
            rows={2}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_ATTACHMENT_TYPES}
                onChange={handlePickFiles}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon data-icon="inline-start" />
                Anexar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMentionPicker((v) => !v)}
              >
                <AtSignIcon data-icon="inline-start" />
                Mencionar
              </Button>
            </div>
            <Button type="submit" size="sm">
              <SendIcon data-icon="inline-start" />
              Comentar
            </Button>
          </div>
          <AttachmentPreviewList attachments={attachments} onRemove={handleRemoveAttachment} />
          {showMentionPicker && (
            <UserMultiSelect
              value={mentionedUserIds}
              onChange={setMentionedUserIds}
              options={roster}
              placeholder="Selecionar pessoas para mencionar"
            />
          )}
        </form>
      ) : (
        <NoPermissionState
          title="Comentários indisponíveis"
          description="Você não tem acesso para comentar nesta tarefa."
        />
      )}
    </div>
  )
}
