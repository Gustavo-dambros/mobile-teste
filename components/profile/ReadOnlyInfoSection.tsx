import { InfoIcon } from "lucide-react"

import { maskCpf } from "@/lib/profile/format"
import type { UserProfile } from "@/components/profile/types"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field>
      <FieldLabel className="text-muted-foreground">{label}</FieldLabel>
      <Input value={value} disabled readOnly />
    </Field>
  )
}

export function ReadOnlyInfoSection({ profile }: { profile: UserProfile }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadOnlyField label="Nome completo" value={profile.name} />
        <ReadOnlyField label="E-mail" value={profile.email} />
        <ReadOnlyField label="Setor" value={profile.sector} />
        <ReadOnlyField label="Telefone" value={profile.phone} />
        <ReadOnlyField label="CPF" value={maskCpf(profile.cpf)} />
      </div>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        Esses dados são administrados pela empresa e não podem ser alterados por este perfil.
      </p>
    </div>
  )
}
