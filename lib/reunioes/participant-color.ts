const AVATAR_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#db2777",
  "#ea580c",
  "#0d9488",
  "#dc2626",
  "#4f46e5",
  "#ca8a04",
  "#0891b2",
]

/** Deterministic per-participant color (avatar ring/fill) shared by the call tiles and chat bubbles. */
export function colorForParticipant(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}
