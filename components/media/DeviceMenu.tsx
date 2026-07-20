"use client"

import * as React from "react"
import { SettingsIcon } from "lucide-react"
import type { Room } from "livekit-client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DeviceOption {
  deviceId: string
  label: string
}

/**
 * Mic/camera/speaker picker for an active LiveKit room. Device labels only
 * resolve once mic/camera permission was already granted, which is always
 * true by the time this renders (inside an active call/meeting).
 */
export function DeviceMenu({ room }: { room: Room | null }) {
  const [mics, setMics] = React.useState<DeviceOption[]>([])
  const [cameras, setCameras] = React.useState<DeviceOption[]>([])
  const [speakers, setSpeakers] = React.useState<DeviceOption[]>([])
  const [activeMic, setActiveMic] = React.useState("default")
  const [activeCamera, setActiveCamera] = React.useState("default")
  const [activeSpeaker, setActiveSpeaker] = React.useState("default")

  async function refresh() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setMics(
        devices.filter((d) => d.kind === "audioinput").map((d) => ({ deviceId: d.deviceId, label: d.label || "Microfone" }))
      )
      setCameras(
        devices.filter((d) => d.kind === "videoinput").map((d) => ({ deviceId: d.deviceId, label: d.label || "Câmera" }))
      )
      setSpeakers(
        devices
          .filter((d) => d.kind === "audiooutput")
          .map((d) => ({ deviceId: d.deviceId, label: d.label || "Alto-falante" }))
      )
    } catch {
      // permission not granted yet / unsupported browser — menu just stays empty
    }
  }

  async function selectDevice(kind: "audioinput" | "videoinput" | "audiooutput", deviceId: string) {
    if (kind === "audioinput") setActiveMic(deviceId)
    if (kind === "videoinput") setActiveCamera(deviceId)
    if (kind === "audiooutput") setActiveSpeaker(deviceId)
    try {
      await room?.switchActiveDevice(kind, deviceId)
    } catch {
      // switch failure isn't actionable here — selection just stays as chosen
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && refresh()}>
      <DropdownMenuTrigger render={<Button type="button" size="icon-lg" variant="outline" className="rounded-full" />}>
        <SettingsIcon />
        <span className="sr-only">Dispositivos de áudio e vídeo</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Microfone</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={activeMic} onValueChange={(v) => selectDevice("audioinput", v)}>
            {mics.length === 0 && (
              <DropdownMenuLabel className="font-normal text-muted-foreground">Nenhum encontrado</DropdownMenuLabel>
            )}
            {mics.map((d) => (
              <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId}>
                {d.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Câmera</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={activeCamera} onValueChange={(v) => selectDevice("videoinput", v)}>
            {cameras.length === 0 && (
              <DropdownMenuLabel className="font-normal text-muted-foreground">Nenhuma encontrada</DropdownMenuLabel>
            )}
            {cameras.map((d) => (
              <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId}>
                {d.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {speakers.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Alto-falante</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={activeSpeaker} onValueChange={(v) => selectDevice("audiooutput", v)}>
                {speakers.map((d) => (
                  <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
