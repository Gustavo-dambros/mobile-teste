let audio: HTMLAudioElement | null = null

export function playTicketNotificationSound() {
  if (typeof window === "undefined") return
  if (!audio) audio = new Audio(encodeURI("/song/notificação.mp3"))
  audio.currentTime = 0
  void audio.play().catch(() => {})
}
