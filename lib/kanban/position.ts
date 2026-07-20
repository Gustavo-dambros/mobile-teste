/**
 * Fractional positioning — moving an item only ever touches the item that
 * moved. Neighbours never need to be rewritten, which is what keeps a drag
 * cheap even with hundreds of cards. Rebalance only when floats run out of
 * precision between two neighbours (effectively never in practice).
 */
const POSITION_GAP = 1000
const MIN_GAP = 1e-7

export function initialPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_GAP)
}

export function nextPosition(items: { position: number }[]): number {
  const max = items.reduce((m, i) => Math.max(m, i.position), 0)
  return max + POSITION_GAP
}

export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_GAP
  if (before === null) return after! / 2
  if (after === null) return before + POSITION_GAP
  return (before + after) / 2
}

export function needsRebalance(before: number | null, after: number | null): boolean {
  if (before === null || after === null) return false
  return after - before < MIN_GAP
}

/** Reassigns evenly-spaced positions in the given order — call after needsRebalance() fires. */
export function rebalancePositions<T>(items: T[]): (T & { position: number })[] {
  return items.map((item, index) => ({ ...item, position: (index + 1) * POSITION_GAP }))
}
