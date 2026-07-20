"use client"

import { motion, useReducedMotion } from "motion/react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { fadeIn, chartReveal } from "@/lib/motion"
import type { DailyTrendPoint, ReportPeriod } from "@/lib/reports/derive"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  criados: {
    label: "Chamados criados",
    color: "var(--primary)",
  },
  concluidos: {
    label: "Chamados concluídos",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const periodDescription: Record<ReportPeriod, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 3 meses",
}

export function TicketsTrendChart({
  data,
  period,
}: {
  data: DailyTrendPoint[]
  period: ReportPeriod
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div variants={fadeIn(reduced, 0.45)} initial="hidden" animate="show">
      <Card className="@container/card">
        <CardHeader className="border-b">
          <CardTitle>Chamados Criados x Concluídos</CardTitle>
          <CardDescription>{periodDescription[period]}</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <motion.div variants={chartReveal(reduced, 0.55)} initial="hidden" animate="show">
            <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="fillCriados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-criados)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--color-criados)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillConcluidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-concluidos)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--color-concluidos)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("pt-BR", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString("pt-BR", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="criados"
                  type="natural"
                  fill="url(#fillCriados)"
                  stroke="var(--color-criados)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="concluidos"
                  type="natural"
                  fill="url(#fillConcluidos)"
                  stroke="var(--color-concluidos)"
                  strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
