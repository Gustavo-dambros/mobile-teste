import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

const MAX_LENGTH = 200

export function StatusMessageSection({
  value,
  onValueChange,
  disabled,
}: {
  value: string
  onValueChange: (value: string) => void
  disabled: boolean
}) {
  const remaining = MAX_LENGTH - value.length

  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor="profile-status-message">Recado</FieldLabel>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() => onValueChange("")}
          >
            <XIcon />
            <span className="sr-only">Limpar recado</span>
          </Button>
        )}
      </div>
      <Textarea
        id="profile-status-message"
        value={value}
        maxLength={MAX_LENGTH}
        placeholder="Ex.: Disponível até as 17h."
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
        className="min-h-20"
      />
      <FieldDescription className={cn("text-right", remaining <= 20 && "text-amber-600 dark:text-amber-400")}>
        {value.length}/{MAX_LENGTH} caracteres
      </FieldDescription>
    </Field>
  )
}
