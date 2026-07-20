"use client"

const SOUND_PATHS = {
  dialing: "/song/ligando.mp3",
  ringing: "/song/chamando.mp3",
  incoming: "/song/recebendo.mp3",
  declined: "/song/recusada.mp3",
  missed: "/song/perdida.mp3",
  hangup: "/song/desligar.mp3",
} as const

/**
 * One playing/looping call-related sound at a time (dialing/ringing/
 * incoming tones loop until stopped; declined/missed/hangup play once).
 * Each CallRingDialog/ChatCallRoom instance owns its own player so starting
 * a new sound always cleanly replaces whatever was playing before.
 */
export class CallSoundPlayer {
  private audio: HTMLAudioElement | null = null

  play(name: keyof typeof SOUND_PATHS, opts: { loop?: boolean; onEnded?: () => void } = {}) {
    this.stop()
    if (typeof window === "undefined") return
    const audio = new Audio(encodeURI(SOUND_PATHS[name]))
    audio.loop = opts.loop ?? false
    if (opts.onEnded) audio.addEventListener("ended", opts.onEnded, { once: true })
    this.audio = audio
    void audio.play().catch(() => {})
  }

  stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.audio = null
    }
  }
}
