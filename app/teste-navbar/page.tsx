"use client"

import BottomNav from "@/components/bottom-navigation"

export default function TesteNavbarPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-4">Teste da Navbar</h1>
      <p className="text-muted-foreground mb-8">
        A navbar fixa deve aparecer na parte inferior da tela com 6 itens (1 a 6).
      </p>
      <div className="text-sm text-muted-foreground">
        Clique nos itens para testar a navegação.
      </div>
      <BottomNav />
    </div>
  )
}
