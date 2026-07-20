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

export const sectorOptions = [
  { label: "SP-Suporte Técnico", value: "SP-Suporte Técnico" },
  { label: "RH-Recursos Humanos", value: "RH-Recursos Humanos" },
  { label: "ADM-Administração", value: "ADM-Administração" },
  { label: "SEP-Serviços Escola Psicologia", value: "SEP-Serviços Escola Psicologia" },
]

export function SectorSelect({
  id,
  value,
  onValueChange,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const selected = sectorOptions.find((s) => s.value === value)

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
          {selected ? selected.label : "Selecione o setor"}
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
          <CommandInput placeholder="Buscar setor..." />
          <CommandList>
            <CommandEmpty>Nenhum setor encontrado.</CommandEmpty>
            <CommandGroup>
              {sectorOptions.map((sector) => (
                <CommandItem
                  key={sector.value}
                  value={sector.label}
                  data-checked={sector.value === value}
                  onSelect={() => {
                    onValueChange(sector.value)
                    setOpen(false)
                  }}
                >
                  {sector.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
