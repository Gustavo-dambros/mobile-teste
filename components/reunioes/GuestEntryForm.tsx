"use client"

import * as React from "react"
import { toast } from "sonner"

import { useReunioes } from "@/lib/reunioes/store"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

type Step = "form" | "otp"

export function GuestEntryForm({
  inviteToken,
  meetingTitle,
  requiresPassword,
  onRequested,
}: {
  inviteToken: string
  meetingTitle: string
  requiresPassword: boolean
  onRequested: (guestId: string) => void
}) {
  const { sendGuestEntryOtp, requestGuestEntry } = useReunioes()
  const [step, setStep] = React.useState<Step>("form")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [code, setCode] = React.useState("")
  const [codeError, setCodeError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  async function sendOtp() {
    const result = await sendGuestEntryOtp(inviteToken, name, email, password.trim() || undefined)
    if (!result.ok) throw new Error(result.error ?? "Não foi possível enviar o código")
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (requiresPassword && !password.trim()) {
      toast.error("Informe a senha da reunião")
      return
    }
    setSubmitting(true)
    try {
      await toast.promise(sendOtp(), {
        loading: "Enviando código para o e-mail...",
        success: "Código enviado para o e-mail",
        error: (error) => (error instanceof Error ? error.message : "Não foi possível enviar o código"),
      })
      setStep("otp")
    } catch {
      // toast.promise already surfaced the error
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 6) {
      setCodeError("Digite os 6 dígitos do código")
      toast.error("Código inválido")
      return
    }
    setCodeError(null)
    setSubmitting(true)
    const result = await requestGuestEntry(inviteToken, name, email, code, password.trim() || undefined)
    setSubmitting(false)
    if (!result.ok || !result.guestId) {
      const message = result.error ?? "Não foi possível solicitar entrada"
      setCodeError(message)
      toast.error(message)
      return
    }
    onRequested(result.guestId)
  }

  function handleResend() {
    toast.promise(sendOtp(), {
      loading: "Reenviando código...",
      success: "Novo código enviado para o e-mail",
      error: "Não foi possível reenviar o código",
    })
  }

  if (step === "otp") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-lg font-semibold">Confirmar código</h1>
          <p className="text-sm text-muted-foreground">
            Digite o código de 6 dígitos enviado para o e-mail {email}
          </p>
        </div>
        <form onSubmit={handleConfirmOtp} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => {
                setCode(value)
                setCodeError(null)
              }}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {codeError && <p className="text-sm text-destructive">{codeError}</p>}
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Confirmando..." : "Confirmar e pedir para entrar"}
          </Button>
          <FieldDescription className="text-center">
            Não recebeu o código?{" "}
            <button
              type="button"
              onClick={handleResend}
              className="underline underline-offset-4 hover:text-primary"
            >
              Reenviar código
            </button>
          </FieldDescription>
          <FieldDescription className="text-center">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="underline underline-offset-4 hover:text-primary"
            >
              Voltar
            </button>
          </FieldDescription>
        </form>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-lg font-semibold">Entrar em &quot;{meetingTitle}&quot;</h1>
        <p className="text-sm text-muted-foreground">
          Informe seu nome e e-mail institucional. Vamos enviar um código de verificação para
          confirmar seu e-mail antes de pedir entrada nesta reunião.
        </p>
      </div>
      <form onSubmit={handleSubmitForm} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="guest-name">Seu nome</FieldLabel>
          <Input
            id="guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
            required
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="guest-email">E-mail (@unipar.br)</FieldLabel>
          <Input
            id="guest-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@unipar.br"
            required
          />
        </Field>
        {requiresPassword && (
          <Field>
            <FieldLabel htmlFor="guest-password">Senha da reunião</FieldLabel>
            <Input
              id="guest-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha definida pelo anfitrião"
              required
            />
          </Field>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Enviando código..." : "Enviar código de verificação"}
        </Button>
      </form>
    </div>
  )
}
