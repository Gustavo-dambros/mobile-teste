/** Masks a CPF for display, revealing only the last 2 digits: ***.***.***-00 */
export function maskCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "")
  if (digits.length < 2) return "***.***.***-**"
  return `***.***.***-${digits.slice(-2)}`
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}
