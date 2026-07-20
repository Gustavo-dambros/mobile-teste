let audio: HTMLAudioElement | null = null

export function playAccessRequestSound() {
  if (typeof window === "undefined") return
  if (!audio) audio = new Audio(encodeURI("/song/notificação.mp3"))
  audio.currentTime = 0
  void audio.play().catch(() => {})
}
