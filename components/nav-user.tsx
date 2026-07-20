"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useProfile } from "@/lib/profile/store"
import { useSystemNotifications } from "@/lib/system-notifications/store"
import { PresenceDot } from "@/components/profile/PresenceDot"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { EllipsisVerticalIcon, CircleUserRoundIcon, InfoIcon, BellIcon, LogOutIcon } from "lucide-react"

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { profile, openProfileModal } = useProfile()
  const { unreadCount } = useSystemNotifications()

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Você saiu do sistema")
    router.push("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <span className="relative shrink-0">
              <Avatar className="size-8 rounded-lg grayscale">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
                <AvatarFallback className="rounded-lg">{initialsOf(profile.name)}</AvatarFallback>
              </Avatar>
              <span className="absolute -right-0.5 -bottom-0.5 flex size-3 items-center justify-center rounded-full bg-sidebar ring-2 ring-sidebar">
                <PresenceDot status={profile.presenceStatus} className="size-2" />
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive ring-2 ring-sidebar" />
              )}
            </span>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{profile.name}</span>
              <span className="truncate text-xs text-foreground/70">{profile.email}</span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
                    <AvatarFallback className="rounded-lg">{initialsOf(profile.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{profile.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={openProfileModal}>
                <CircleUserRoundIcon />
                Meu perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <InfoIcon />
                Informações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/notificacoes")}>
                <span className="relative shrink-0">
                  <BellIcon />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-destructive" />
                  )}
                </span>
                Notificações
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOutIcon />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
