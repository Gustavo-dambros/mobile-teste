import { DashboardShell } from "@/components/dashboard-shell"
import { AtividadesSetorProvider } from "@/lib/atividades-setor/store"
import { ActivityDetailPage } from "@/components/atividades-setor/ActivityDetailPage"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <DashboardShell>
      <AtividadesSetorProvider>
        <ActivityDetailPage eventId={id} />
      </AtividadesSetorProvider>
    </DashboardShell>
  )
}
