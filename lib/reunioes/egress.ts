import "server-only"

import { EgressClient } from "livekit-server-sdk"

export function getEgressClient(): EgressClient {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const livekitHttpUrl = process.env.LIVEKIT_URL
  if (!apiKey || !apiSecret || !livekitHttpUrl) {
    throw new Error("LiveKit ainda não está configurado neste ambiente.")
  }
  return new EgressClient(livekitHttpUrl, apiKey, apiSecret)
}

/** Host directory the egress container writes finished recordings into (bind-mounted at
 * /out inside that container — see /opt/livekit/docker-compose.yml on the server). The
 * Next.js app reads from the same path since both run on the same host. */
export function recordingsDir(): string {
  const dir = process.env.LIVEKIT_RECORDINGS_DIR
  if (!dir) throw new Error("LIVEKIT_RECORDINGS_DIR não configurado no .env")
  return dir
}

// Flat filename (no subdirectories) — the egress process writes to this path directly and
// does not create intermediate directories on its own.
export function recordingRelativePath(meetingId: string, fileId: string): string {
  return `${meetingId}-${fileId}.mp4`
}
