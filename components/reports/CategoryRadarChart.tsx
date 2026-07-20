"use client"

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import type { CategoryCount } from "@/lib/reports/derive"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export function CategoryRadarChart({
  data,
  color,
}: {
  data: CategoryCount[]
  color: string
}) {
  const chartConfig = {
    total: {
      label: "Total",
      color,
    },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[250px] w-full"
    >
      <RadarChart data={data}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <PolarGrid />
        <Radar
          dataKey="total"
          fill="var(--color-total)"
          fillOpacity={0.55}
          stroke="var(--color-total)"
        />
      </RadarChart>
    </ChartContainer>
  )
}
