"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { CheckCircle2Icon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { loginFields, loginField, hoverScaleSm, tapScaleSm, microTap } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Input } from "@/components/ui/input"
import { SectorSelect } from "@/components/sector-select"

type Step = "form" | "otp" | "success"

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 4) return value
  return `•••• ${digits.slice(-4)}`
}

function StepPanel({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        "col-start-1 row-start-1 transition-opacity duration-200",
        active ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
      )}
    >
      {children}
    </div>
  )
}

export function RecoverAccountForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const reduced = useReducedMotion()
  const [step, setStep] = React.useState<Step>("form")
  const [email, setEmail] = React.useState("")
  const [sector, setSector] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [otp, setOtp] = React.useState("")
  const [otpError, setOtpError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [otpId, setOtpId] = React.useState<string | null>(null)

  async function requestOtp() {
    const res = await fetch("/api/recuperar-conta/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), sector, phone }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar o código")
    return data.otpId as string
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!/@unipar\.br$/i.test(email.trim())) {
      setEmailError("O e-mail deve pertencer ao domínio @unipar.br")
      toast.error("E-mail inválido")
      return
    }
    if (!sector) {
      toast.error("Selecione o setor")
      return
    }
    setEmailError(null)
    setSubmitting(true)
    toast.promise(requestOtp(), {
      loading: "Enviando código para o WhatsApp...",
      success: (id) => {
        setOtpId(id as string)
        setSubmitting(false)
        setStep("otp")
        return "Código enviado para o WhatsApp"
      },
      error: (err) => {
        setSubmitting(false)
        return err instanceof Error ? err.message : "Não foi possível enviar o código"
      },
    })
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length < 6) {
      setOtpError("Digite os 6 dígitos do código")
      toast.error("Código inválido")
      return
    }
    if (!otpId) {
      toast.error("Solicite um novo código")
      setStep("form")
      return
    }
    setOtpError(null)
    try {
      const res = await fetch("/api/recuperar-conta/confirm-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, code: otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Código inválido")
      toast.success("Código confirmado com sucesso")
      setStep("success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Código inválido"
      setOtpError(message)
      toast.error(message)
    }
  }

  function handleResend() {
    toast.promise(requestOtp(), {
      loading: "Reenviando código...",
      success: (id) => {
        setOtpId(id as string)
        return "Novo código enviado para o WhatsApp"
      },
      error: (err) => (err instanceof Error ? err.message : "Não foi possível reenviar o código"),
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-10">
            <div className="grid">
              <StepPanel active={step === "form"}>
                <motion.div
                  variants={loginFields(reduced, 0)}
                  initial="hidden"
                  animate={step === "form" ? "show" : "hidden"}
                >
                  <form onSubmit={handleSubmitForm}>
                    <FieldGroup className="gap-6">
                      <motion.div
                        variants={loginField(reduced)}
                        className="flex flex-col items-center gap-2 text-center"
                      >
                        <h1 className="text-2xl font-bold">Recuperar Conta</h1>
                        <p className="text-balance text-muted-foreground">
                          Informe seus dados para receber um código de acesso
                          no WhatsApp
                        </p>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field data-invalid={!!emailError}>
                          <FieldLabel htmlFor="email">
                            E-mail corporativo
                          </FieldLabel>
                          <Input
                            id="email"
                            type="email"
                            placeholder="voce@unipar.br"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              setEmailError(null)
                            }}
                            aria-invalid={!!emailError}
                            required
                          />
                          {emailError && <FieldError>{emailError}</FieldError>}
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
                              {submitting ? "Enviando..." : "Enviar código"}
                            </Button>
                          </motion.div>
                        </Field>
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <FieldDescription className="text-center">
                          Lembrou sua senha?{" "}
                          <Link href="/login">Voltar para o login</Link>
                        </FieldDescription>
                      </motion.div>
                    </FieldGroup>
                  </form>
                </motion.div>
              </StepPanel>

              <StepPanel active={step === "otp"}>
                <motion.div
                  variants={loginFields(reduced, 0)}
                  initial="hidden"
                  animate={step === "otp" ? "show" : "hidden"}
                  className="flex h-full flex-col justify-center"
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
                          Digite o código de 6 dígitos enviado para o WhatsApp{" "}
                          {maskPhone(phone)}
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
                        {otpError && <FieldError>{otpError}</FieldError>}
                      </motion.div>
                      <motion.div variants={loginField(reduced)}>
                        <Field>
                          <motion.div
                            whileHover={reduced ? undefined : hoverScaleSm}
                            whileTap={reduced ? undefined : tapScaleSm}
                            transition={microTap(reduced)}
                          >
                            <Button type="submit" className="w-full">
                              Confirmar
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
              </StepPanel>

              <StepPanel active={step === "success"}>
                <motion.div
                  variants={loginFields(reduced, 0)}
                  initial="hidden"
                  animate={step === "success" ? "show" : "hidden"}
                  className="flex h-full flex-col items-center justify-center gap-6 text-center"
                >
                  <motion.div
                    variants={loginField(reduced)}
                    className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <CheckCircle2Icon className="size-6" />
                  </motion.div>
                  <motion.div
                    variants={loginField(reduced)}
                    className="flex flex-col gap-2"
                  >
                    <h1 className="text-2xl font-bold">
                      Verifique seu WhatsApp
                    </h1>
                    <p className="text-balance text-muted-foreground">
                      As informações de acesso foram enviadas para o seu
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
              </StepPanel>
            </div>
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
