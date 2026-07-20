import type { PresenceStatus } from "@/components/profile/types"
import { presenceItems } from "@/components/profile/types"
import { PresenceDot } from "@/components/profile/PresenceDot"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function PresenceSection({
  value,
  onValueChange,
  disabled,
}: {
  value: PresenceStatus
  onValueChange: (value: PresenceStatus) => void
  disabled: boolean
}) {
  return (
    <Field>
      <FieldLabel htmlFor="profile-presence">Presença</FieldLabel>
      <Select
        value={value}
        items={presenceItems}
        onValueChange={(v) => v && onValueChange(v as PresenceStatus)}
        disabled={disabled}
      >
        <SelectTrigger id="profile-presence" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {presenceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <span className="flex items-center gap-2">
                  <PresenceDot status={item.value} />
                  {item.label}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
