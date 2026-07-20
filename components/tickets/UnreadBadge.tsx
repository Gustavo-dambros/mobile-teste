export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums"
      aria-label={`${count} atualização(ões) não vista(s)`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
