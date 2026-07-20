"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ClockIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { loginFields, loginField, hoverScaleSm, tapScaleSm, microTap } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SectorSelect } from "@/components/sector-select"

type Step = "form" | "otp" | "success"

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 4) return value
  return `•••• ${digits.slice(-4)}`
}

function formatCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function AccessRequestForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const reduced = useReducedMotion()
  const [step, setStep] = React.useState<Step>("form")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [sector, setSector] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [cpf, setCpf] = React.useState("")
  const [cpfConfirm, setCpfConfirm] = React.useState("")
  const [acceptedTerms, setAcceptedTerms] = React.useState(false)
  const [otp, setOtp] = React.useState("")
  const [otpError, setOtpError] = React.useState<string | null>(null)
  const [otpId, setOtpId] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  async function sendOtp() {
    const response = await fetch("/api/access-request/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        sector,
        cpf,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? "Não foi possível enviar o código")
    if (data.skipped) return true
    setOtpId(data.otpId)
    return false
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Informe seu nome completo")
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("E-mail inválido")
      return
    }
    if (!email.trim().toLowerCase().endsWith("@unipar.br")) {
      toast.error("Use um e-mail terminado em @unipar.br")
      return
    }
    if (!sector) {
      toast.error("Selecione o setor")
      return
    }
    if (!phone.trim()) {
      toast.error("Informe o telefone")
      return
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      toast.error("CPF inválido")
      return
    }
    if (cpf !== cpfConfirm) {
      toast.error("Os CPFs não coincidem")
      return
    }
    if (!acceptedTerms) {
      toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade")
      return
    }

    setSubmitting(true)
    try {
      const promise = sendOtp()
      toast.promise(promise, {
        loading: "Enviando solicitação...",
        success: (skipped) =>
          skipped ? "Solicitação enviada com sucesso" : "Código enviado para o e-mail",
        error: (error) => (error instanceof Error ? error.message : "Não foi possível enviar o código"),
      })
      const skipped = await promise
      setStep(skipped ? "success" : "otp")
    } catch {
      // toast.promise already surfaced the error
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length < 6) {
      setOtpError("Digite os 6 dígitos do código")
      toast.error("Código inválido")
      return
    }
    if (!otpId) {
      setOtpError("Sessão expirada. Volte e solicite um novo código.")
      return
    }
    setOtpError(null)
    setSubmitting(true)
    try {
      const response = await fetch("/api/access-request/confirm-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, code: otp }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Código inválido")
      toast.success("Código confirmado com sucesso")
      setStep("success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Código inválido"
      setOtpError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleResend() {
    toast.promise(sendOtp(), {
      loading: "Reenviando código...",
      success: "Novo código enviado para o e-mail",
      error: "Não foi possível reenviar o código",
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-10">
            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.div
                  key="form"
                  variants={loginFields(reduced, 0)}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                >
                  <form onSubmit={handleSubmitForm}>
                    <FieldGroup className="gap-5">
                      <motion.div
                        variants={loginField(reduced)}
                        className="flex flex-col items-center gap-2 text-center"
                      >
                        <h1 className="text-2xl font-bold">
                          Solicitação de Acesso
                        </h1>
                        <p className="text-balance text-muted-foreground">
                          Preencha os dados abaixo para solicitar acesso ao
                          sistema
                        </p>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <FieldLabel htmlFor="name">Nome</FieldLabel>
                          <Input
                            id="name"
                            placeholder="Seu nome completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <FieldLabel htmlFor="email">E-mail</FieldLabel>
                          <Input
                            id="email"
                            type="email"
                            placeholder="voce@unipar.br"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <FieldLabel htmlFor="sector">Setor</FieldLabel>
                          <SectorSelect
                            id="sector"
                            value={sector}
                            onValueChange={setSector}
                          />
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <FieldLabel htmlFor="phone">
                            Telefone (WhatsApp)
                          </FieldLabel>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="(45) 99999-9999"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                          />
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <FieldLabel htmlFor="cpf">CPF</FieldLabel>
                          <Input
                            id="cpf"
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            value={cpf}
                            onChange={(e) => setCpf(formatCPF(e.target.value))}
                            required
                          />
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <FieldLabel htmlFor="cpf-confirm">
                            Confirmação de CPF
                          </FieldLabel>
                          <Input
                            id="cpf-confirm"
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            value={cpfConfirm}
                            onChange={(e) =>
                              setCpfConfirm(formatCPF(e.target.value))
                            }
                            required
                          />
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="terms"
                            checked={acceptedTerms}
                            onCheckedChange={(value) =>
                              setAcceptedTerms(!!value)
                            }
                            className="mt-0.5"
                          />
                          <Label
                            htmlFor="terms"
                            className="text-sm leading-snug font-normal"
                          >
                            Li e aceito os <a href="#" className="underline underline-offset-4 hover:text-primary">Termos de Uso</a>{" "}
                            e a{" "}
                            <a href="#" className="underline underline-offset-4 hover:text-primary">
                              Política de Privacidade
                            </a>
                          </Label>
                        </div>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <motion.div
                            whileHover={reduced ? undefined : hoverScaleSm}
                            whileTap={reduced ? undefined : tapScaleSm}
                            transition={microTap(reduced)}
                          >
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={submitting}
                            >
                              {submitting ? "Enviando..." : "Solicitar Acesso"}
                            </Button>
                          </motion.div>
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <FieldDescription className="text-center">
                          Já tem uma conta? <Link href="/login">Entrar</Link>
                        </FieldDescription>
                      </motion.div>
                    </FieldGroup>
                  </form>
                </motion.div>
              )}

              {step === "otp" && (
                <motion.div
                  key="otp"
                  variants={loginFields(reduced, 0)}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                  className="flex h-full min-h-[520px] flex-col justify-center"
                >
                  <form onSubmit={handleConfirmOtp}>
                    <FieldGroup className="gap-6">
                      <motion.div
                        variants={loginField(reduced)}
                        className="flex flex-col items-center gap-2 text-center"
                      >
                        <h1 className="text-2xl font-bold">
                          Confirmar código
                        </h1>
                        <p className="text-balance text-muted-foreground">
                          Digite o código de 6 dígitos enviado para o e-mail{" "}
                          {email}
                        </p>
                      </motion.div>
                      <motion.div
                        variants={loginField(reduced)}
                        className="flex flex-col items-center gap-2"
                      >
                        <InputOTP
                          maxLength={6}
                          value={otp}
                          onChange={(value) => {
                            setOtp(value)
                            setOtpError(null)
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
                        {otpError && (
                          <p className="text-sm text-destructive">
                            {otpError}
                          </p>
                        )}
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <motion.div
                            whileHover={reduced ? undefined : hoverScaleSm}
                            whileTap={reduced ? undefined : tapScaleSm}
                            transition={microTap(reduced)}
                          >
                            <Button type="submit" className="w-full" disabled={submitting}>
                              {submitting ? "Confirmando..." : "Confirmar"}
                            </Button>
                          </motion.div>
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
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
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <FieldDescription className="text-center">
                          <Link href="/login">Voltar para o login</Link>
                        </FieldDescription>
                      </motion.div>
                    </FieldGroup>
                  </form>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  variants={loginFields(reduced, 0)}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                  className="flex h-full min-h-[520px] flex-col items-center justify-center gap-6 text-center"
                >
                  <motion.div
                    variants={loginField(reduced)}
                    className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <ClockIcon className="size-6" />
                  </motion.div>
                  <motion.div
                    variants={loginField(reduced)}
                    className="flex flex-col gap-2"
                  >
                    <h1 className="text-2xl font-bold">
                      Solicitação enviada com sucesso
                    </h1>
                    <p className="text-balance text-muted-foreground">
                      Sua solicitação de acesso foi enviada. Em até 24 horas
                      seu acesso será liberado e você será avisado pelo
                      WhatsApp {maskPhone(phone)}.
                    </p>
                  </motion.div>
                  <motion.div variants={loginField(reduced)} className="w-full">
                    <motion.div
                      whileHover={reduced ? undefined : hoverScaleSm}
                      whileTap={reduced ? undefined : tapScaleSm}
                      transition={microTap(reduced)}
                    >
                      <Button
                        className="w-full"
                        nativeButton={false}
                        render={<Link href="/login" />}
                      >
                        Voltar para o login
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative hidden bg-muted md:flex md:items-center md:justify-center">
            <Image
              src="/logo.png"
              alt="Unipar"
              width={160}
              height={160}
              priority
              className="size-32 object-contain opacity-90 dark:brightness-[0.9]"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Precisa de ajuda? Entre em contato com o suporte de TI.
      </FieldDescription>
    </div>
  )
}
