import { DashboardShell } from "@/components/dashboard-shell"
import { AtividadesSetorProvider } from "@/lib/atividades-setor/store"
import { AtividadesSetorPage } from "@/components/atividades-setor/AtividadesSetorPage"

export default function Page() {
  return (
    <DashboardShell title="Atividades do Setor">
      <AtividadesSetorProvider>
        <AtividadesSetorPage />
      </AtividadesSetorProvider>
    </DashboardShell>
  )
}
