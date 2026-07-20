export const sectorItems = [
  "Tecnologia da Informação",
  "Recursos Humanos",
  "Financeiro",
  "Comercial",
  "Logística",
  "Jurídico",
  "Marketing",
  "Produção",
  "Qualidade",
  "Operações",
].map((label) => ({ label, value: label }))

export const roleItems = [
  { label: "Admin", value: "Admin" },
  { label: "Usuário", value: "Usuário" },
]

export const presenceItems = ["Online", "Ocupado", "Ausente", "Offline"].map((label) => ({
  label,
  value: label,
}))

export const activityItems = ["Presencial", "Home office", "Reunião", "Férias", "Intervalo"].map(
  (label) => ({ label, value: label })
)

export const teamFilterFields = [
  { value: "name", label: "Nome" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "sector", label: "Setor" },
  { value: "role", label: "Status" },
  { value: "presence", label: "Presença" },
  { value: "activity", label: "Atividade" },
]
