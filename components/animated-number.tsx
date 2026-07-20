"use client"

import { useEffect, useState } from "react"
import { animate } from "motion/react"

export function AnimatedNumber({
  value,
  format,
  duration = 1,
  delay = 0,
}: {
  value: number
  format: (value: number) => string
  duration?: number
  delay?: number
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    })
    return () => controls.stop()
  }, [value, duration, delay])

  return <>{format(display)}</>
}
