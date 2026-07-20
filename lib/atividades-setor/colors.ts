"use client"

// Deterministic per-person color, derived from their (stable) uuid instead
// of an array index — no server round-trip needed just to color an avatar,
// and the same person always gets the same color across sessions.
export const CALENDAR_COLOR_PALETTE = [
  "#2563eb", // blue
  "#16a34a", // green
  "#9333ea", // purple
  "#db2777", // pink
  "#ea580c", // orange
  "#0d9488", // teal
  "#dc2626", // red
  "#4f46e5", // indigo
  "#ca8a04", // amber
  "#0891b2", // cyan
  "#65a30d", // lime
  "#c026d3", // fuchsia
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getCalendarColor(userId: string): string {
  if (!userId) return CALENDAR_COLOR_PALETTE[0]
  return CALENDAR_COLOR_PALETTE[hashString(userId) % CALENDAR_COLOR_PALETTE.length]
}
