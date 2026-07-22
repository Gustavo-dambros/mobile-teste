import { InfoIcon } from "lucide-react"

import { maskCpf } from "@/lib/profile/format"
import type { UserProfile } from "@/components/profile/types"

export function ReadOnlyInfoSection({ profile }: { profile: UserProfile }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{profile.name}</p>
      <p className="text-sm text-muted-foreground">{profile.email}</p>
      <p className="text-sm text-muted-foreground">{profile.sector}</p>
      <p className="text-sm text-muted-foreground">{profile.phone}</p>
      <p className="text-sm text-muted-foreground">{maskCpf(profile.cpf)}</p>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-2">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        Esses dados são administrados pela empresa e não podem ser alterados por este perfil.
      </p>
    </div>
  )
}
