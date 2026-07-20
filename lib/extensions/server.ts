import "server-only"

export const EXTENSION_SELECT = "id, name, sector, number, created_at"

interface ExtensionRow {
  id: string
  name: string
  sector: string | null
  number: string
  created_at: string
}

export function mapExtensionRow(row: ExtensionRow) {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector ?? undefined,
    number: row.number,
    createdAt: row.created_at,
  }
}
