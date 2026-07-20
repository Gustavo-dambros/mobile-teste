"use client"

import * as React from "react"
import { ChevronRightIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { RosterMember } from "@/lib/chat-interno/use-roster"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function UserMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar pessoas",
  searchPlaceholder = "Nome, e-mail ou setor...",
  emptyLabel = "Nenhuma pessoa encontrada.",
}: {
  value: string[]
  onChange: (next: string[]) => void
  options: RosterMember[]
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = options.filter((m) => value.includes(m.id))

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between font-normal"
            />
          }
        >
          <span className={cn(value.length === 0 && "text-muted-foreground")}>
            {value.length > 0 ? `${value.length} selecionado(s)` : placeholder}
          </span>
          <ChevronRightIcon
            className={cn("opacity-50 transition-transform duration-200", open && "rotate-90")}
          />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {options.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={`${member.name} ${member.email} ${member.sector}`}
                    data-checked={value.includes(member.id)}
                    onSelect={() => toggle(member.id)}
                  >
                    <Avatar size="sm">
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{member.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {member.sector}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((member) => (
            <Badge key={member.id} variant="secondary" className="gap-1 pr-1">
              {member.name}
              <button
                type="button"
                onClick={() => toggle(member.id)}
                className="rounded-full p-0.5 hover:bg-foreground/10"
              >
                <XIcon className="size-3" />
                <span className="sr-only">Remover {member.name}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
