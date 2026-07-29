import { z } from "zod"

// ─── POST /api/recuperar-conta/send-otp — Solicitar recuperação ──

export const sendRecoveryOtpSchema = z.object({
  email: z.string().email(),
  sector: z.string().min(1),
  phone: z.string().min(8),
})

export type SendRecoveryOtpInput = z.infer<typeof sendRecoveryOtpSchema>

// ─── POST /api/recuperar-conta/confirm-otp — Confirmar OTP ────────

export const confirmRecoveryOtpSchema = z.object({
  otpId: z.string(),
  code: z.string().length(6),
})

export type ConfirmRecoveryOtpInput = z.infer<typeof confirmRecoveryOtpSchema>
