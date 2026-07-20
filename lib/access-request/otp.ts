import "server-only"
import { createHash, randomInt } from "crypto"

import type { createAdminClient } from "@/lib/supabase/admin"

export const OTP_TTL_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
export const OTP_SEND_COOLDOWN_SECONDS = 60

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

export function hashOtpCode(code: string) {
  const pepper = process.env.OTP_HASH_PEPPER
  if (!pepper) throw new Error("OTP_HASH_PEPPER não configurado no .env.local")
  return createHash("sha256").update(`${code}:${pepper}`).digest("hex")
}

export class OtpSendCooldownError extends Error {
  constructor() {
    super("Aguarde um pouco antes de pedir um novo código.")
    this.name = "OtpSendCooldownError"
  }
}

/** Throttles OTP-send endpoints that would otherwise let a caller trigger unlimited
 * emails/WhatsApp messages by resubmitting the same identifier — throws unless the
 * most recent OTP row for `match` is older than OTP_SEND_COOLDOWN_SECONDS. */
export async function assertOtpSendCooldown(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  match: Record<string, string>
) {
  const { data } = await admin
    .from(table)
    .select("created_at")
    .match(match)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return
  const elapsedMs = Date.now() - new Date(data.created_at as string).getTime()
  if (elapsedMs < OTP_SEND_COOLDOWN_SECONDS * 1000) {
    throw new OtpSendCooldownError()
  }
}
