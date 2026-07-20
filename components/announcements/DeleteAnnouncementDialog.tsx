"use client"

import { toast } from "sonner"

import { useAnnouncements } from "@/lib/announcements/store"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function DeleteAnnouncementDialog() {
  const {
    deletingAnnouncementId,
    closeDeleteConfirm,
    closeDetail,
    deleteAnnouncement,
  } = useAnnouncements()

  async function handleConfirm() {
    if (!deletingAnnouncementId) return
    const result = await deleteAnnouncement(deletingAnnouncementId)
    if (!result.ok) {
      toast.error(result.error ?? "Você não tem permissão para excluir este anúncio ou evento")
      closeDeleteConfirm()
      return
    }
    toast.success("Excluído com sucesso")
    closeDeleteConfirm()
    closeDetail()
  }

  return (
    <AlertDialog
      open={!!deletingAnnouncementId}
      onOpenChange={(open) => !open && closeDeleteConfirm()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir publicação</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza de que deseja excluir este anúncio ou evento? Esta ação não poderá ser
            desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
