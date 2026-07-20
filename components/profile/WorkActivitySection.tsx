import type { WorkActivityStatus } from "@/components/profile/types"
import { workActivityItems } from "@/components/profile/types"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function WorkActivitySection({
  value,
  onValueChange,
  disabled,
}: {
  value: WorkActivityStatus
  onValueChange: (value: WorkActivityStatus) => void
  disabled: boolean
}) {
  return (
    <Field>
      <FieldLabel htmlFor="profile-activity">Atividade atual</FieldLabel>
      <Select
        value={value}
        items={workActivityItems}
        onValueChange={(v) => v && onValueChange(v as WorkActivityStatus)}
        disabled={disabled}
      >
        <SelectTrigger id="profile-activity" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {workActivityItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <span className="flex items-center gap-2">
                  <item.icon className="size-4 text-muted-foreground" />
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
