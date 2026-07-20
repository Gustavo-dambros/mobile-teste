"use client"

const SOUND_PATHS = {
  request: "/song/pedido.mp3",
  entry: "/song/entrada.mp3",
} as const

/** One-shot cue, no looping needed — a waiting-room request or a new participant joining. */
export function playMeetingSound(name: keyof typeof SOUND_PATHS) {
  if (typeof window === "undefined") return
  const audio = new Audio(SOUND_PATHS[name])
  void audio.play().catch(() => {})
}
