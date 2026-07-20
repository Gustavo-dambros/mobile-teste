export function formatCPFMask(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function cpfDigits(value: string) {
  return value.replace(/\D/g, "")
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR")
}
