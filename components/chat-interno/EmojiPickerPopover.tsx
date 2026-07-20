"use client"

import * as React from "react"
import { SmileIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const EMOJIS = [
  "😀", "😂", "😍", "😢", "😮", "😡", "👍", "👎", "🙏", "🎉",
  "❤️", "🔥", "👏", "🤔", "😴", "😅", "😎", "🙌", "💯", "✅",
]

export function EmojiPickerPopover({
  onPick,
  align = "start",
  renderTrigger,
  children,
}: {
  onPick: (emoji: string) => void
  align?: "start" | "center" | "end"
  renderTrigger?: React.ReactElement
  children?: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={renderTrigger ?? <Button type="button" variant="ghost" size="icon" />}>
        {children ?? (
          <>
            <SmileIcon />
            <span className="sr-only">Emoji</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-2">
        <div className="grid grid-cols-6 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onPick(emoji)
                setOpen(false)
              }}
              className="flex size-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
