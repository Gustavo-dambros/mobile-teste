import { z } from "zod"

const ACCESS_REQUEST_EMAIL_DOMAIN = "@unipar.br"

// ─── POST /api/access-request/send-otp — Solicitar acesso (OTP) ──

export const sendAccessRequestOtpSchema = z.object({
  name: z.string().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine((v) => v.endsWith(ACCESS_REQUEST_EMAIL_DOMAIN), {
      message: `Use um e-mail terminado em ${ACCESS_REQUEST_EMAIL_DOMAIN}`,
    }),
  phone: z.string().min(8),
  sector: z.string().min(1),
  cpf: z.string().min(11),
})

export type SendAccessRequestOtpInput = z.infer<typeof sendAccessRequestOtpSchema>

// ─── POST /api/access-request/confirm-otp — Confirmar OTP ─────────

export const confirmAccessRequestOtpSchema = z.object({
  otpId: z.string(),
  code: z.string().length(6),
})

export type ConfirmAccessRequestOtpInput = z.infer<typeof confirmAccessRequestOtpSchema>
