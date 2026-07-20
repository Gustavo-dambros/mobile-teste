"use client"

import { AccessRequestsPanel } from "@/components/administracao/access-requests/AccessRequestsPanel"
import { UsersSection } from "@/components/administracao/users/UsersSection"

export function UserCreationSection() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <AccessRequestsPanel />
      <div className="flex min-h-0 flex-1 flex-col">
        <UsersSection />
      </div>
    </div>
  )
}
