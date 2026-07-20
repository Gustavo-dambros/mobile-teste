"use client"

import * as React from "react"
import { ChevronRightIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatRoster } from "@/lib/chat-interno/use-roster"
import type { RecipientMode, RecipientSelection } from "@/components/announcements/types"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

const MODE_TABS: { value: RecipientMode; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "sectors", label: "Setores" },
  { value: "people", label: "Pessoas" },
]

export function RecipientSelect({
  value,
  onChange,
}: {
  value: RecipientSelection
  onChange: (next: RecipientSelection) => void
}) {
  const roster = useChatRoster()
  const sectorOptions = React.useMemo(
    () => Array.from(new Set(roster.map((m) => m.sector))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [roster]
  )
  const [sectorPopoverOpen, setSectorPopoverOpen] = React.useState(false)
  const [peoplePopoverOpen, setPeoplePopoverOpen] = React.useState(false)

  function setMode(mode: RecipientMode) {
    onChange({ ...value, mode })
  }

  function toggleSector(sector: string) {
    const has = value.sectorIds.includes(sector)
    onChange({
      ...value,
      sectorIds: has
        ? value.sectorIds.filter((s) => s !== sector)
        : [...value.sectorIds, sector],
    })
  }

  function togglePerson(id: string) {
    const has = value.userIds.includes(id)
    onChange({
      ...value,
      userIds: has ? value.userIds.filter((u) => u !== id) : [...value.userIds, id],
    })
  }

  const selectedPeople = roster.filter((m) => value.userIds.includes(m.id))
  const activeRecipientCount =
    value.mode === "all"
      ? roster.length
      : value.mode === "sectors"
        ? roster.filter((m) => value.sectorIds.includes(m.sector)).length
        : value.userIds.length

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={value.mode} onValueChange={(v) => setMode(v as RecipientMode)}>
        <TabsList className="w-full">
          {MODE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="all" className="pt-3">
          <p className="text-sm text-muted-foreground">
            Será enviado para todos os usuários ativos do sistema.
          </p>
        </TabsContent>
        <TabsContent value="sectors" className="flex flex-col gap-2 pt-3">
          <Popover open={sectorPopoverOpen} onOpenChange={setSectorPopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                />
              }
            >
              <span className={cn(value.sectorIds.length === 0 && "text-muted-foreground")}>
                {value.sectorIds.length > 0
                  ? `${value.sectorIds.length} setor(es) selecionado(s)`
                  : "Selecione um ou mais setores"}
              </span>
              <ChevronRightIcon
                className={cn(
                  "opacity-50 transition-transform duration-200",
                  sectorPopoverOpen && "rotate-90"
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
                        key={sector}
                        value={sector}
                        data-checked={value.sectorIds.includes(sector)}
                        onSelect={() => toggleSector(sector)}
                      >
                        {sector}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {value.sectorIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {value.sectorIds.map((sector) => (
                <Badge key={sector} variant="secondary" className="gap-1 pr-1">
                  {sector}
                  <button
                    type="button"
                    onClick={() => toggleSector(sector)}
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <XIcon className="size-3" />
                    <span className="sr-only">Remover {sector}</span>
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="people" className="flex flex-col gap-2 pt-3">
          <Popover open={peoplePopoverOpen} onOpenChange={setPeoplePopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                />
              }
            >
              <span className={cn(value.userIds.length === 0 && "text-muted-foreground")}>
                {value.userIds.length > 0
                  ? `${value.userIds.length} pessoa(s) selecionada(s)`
                  : "Buscar por nome, e-mail ou setor"}
              </span>
              <ChevronRightIcon
                className={cn(
                  "opacity-50 transition-transform duration-200",
                  peoplePopoverOpen && "rotate-90"
                )}
              />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-(--anchor-width) p-0">
              <Command>
                <CommandInput placeholder="Nome, e-mail ou setor..." />
                <CommandList>
                  <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                  <CommandGroup>
                    {roster.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={`${member.name} ${member.email} ${member.sector}`}
                        data-checked={value.userIds.includes(member.id)}
                        onSelect={() => togglePerson(member.id)}
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
          {selectedPeople.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedPeople.map((member) => (
                <Badge key={member.id} variant="secondary" className="gap-1 pr-1">
                  {member.name}
                  <button
                    type="button"
                    onClick={() => togglePerson(member.id)}
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <XIcon className="size-3" />
                    <span className="sr-only">Remover {member.name}</span>
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        {activeRecipientCount === 0
          ? "Nenhum destinatário selecionado ainda."
          : `${activeRecipientCount} usuário(s) vão receber esta publicação.`}
      </p>
    </div>
  )
}
