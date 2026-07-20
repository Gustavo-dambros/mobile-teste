import { NextResponse } from "next/server"
import { WebhookReceiver, authorizeHeader } from "livekit-server-sdk"

import { finalizeEgressResult } from "@/lib/reunioes/recordings"
import { createAdminClient } from "@/lib/supabase/admin"

function getReceiver() {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) throw new Error("LiveKit não configurado")
  return new WebhookReceiver(apiKey, apiSecret)
}

/** LiveKit server calls this directly (see `webhook.urls` in /opt/livekit/livekit.yaml) when
 * it can reach this app — on this deployment it currently can't (the livekit-server container
 * has no route to the host's Next.js process), so in practice reconcilePendingRecordings
 * (lib/reunioes/recordings.ts) is what actually finalizes recordings, polling LiveKit instead
 * of waiting for this callback. Left in place as a free win for whenever that networking gap
 * gets closed. Every event is verified via the signed Authorize header before anything in the
 * body is trusted. */
export async function POST(request: Request) {
  const body = await request.text()
  let event
  try {
    event = await getReceiver().receive(body, request.headers.get(authorizeHeader) ?? undefined)
  } catch (error) {
    console.error("[reunioes] egress webhook signature check failed", error)
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
  }

  if (event.event !== "egress_ended" || !event.egressInfo) {
    return NextResponse.json({ ok: true })
  }

  const info = event.egressInfo
  const admin = createAdminClient()
  const { data: recording } = await admin
    .from("meeting_recordings")
    .select("id, egress_id, local_path")
    .eq("egress_id", info.egressId)
    .maybeSingle()
  if (!recording) return NextResponse.json({ ok: true })

  await finalizeEgressResult(recording, info)
  return NextResponse.json({ ok: true })
}
