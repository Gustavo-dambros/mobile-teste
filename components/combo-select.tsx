"use client"

import * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ComboSelectOption {
  label: string
  value: string
}

export function ComboSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Selecione uma opção",
  searchPlaceholder = "Buscar...",
  emptyLabel = "Nenhum resultado encontrado.",
  searchable = true,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: ComboSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  searchable?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronRightIcon
          className={cn(
            "opacity-50 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          {searchable && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  data-checked={option.value === value}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
