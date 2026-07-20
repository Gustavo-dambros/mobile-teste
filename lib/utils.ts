import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const HASH_COLOR_PALETTE = [
  "#2563eb", "#16a34a", "#9333ea", "#db2777", "#ea580c",
  "#0d9488", "#dc2626", "#4f46e5", "#ca8a04", "#0891b2",
]

/** Deterministic color from a string key — used to tint avatars per person without hardcoding anyone to a fixed color. */
export function hashColor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return HASH_COLOR_PALETTE[hash % HASH_COLOR_PALETTE.length]
}
