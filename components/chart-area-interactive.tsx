"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { fadeIn, chartReveal } from "@/lib/motion"
import { useIsMobile } from "@/hooks/use-mobile"
import type { DashboardChartPoint } from "@/lib/dashboard/server"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "Um gráfico de área interativo"

/** The server sends "YYYY-MM-DD" calendar-day keys (UTC-based, see
 * lib/dashboard/server.ts). `new Date("YYYY-MM-DD")` parses that as UTC
 * midnight, which then renders a day early for anyone west of UTC (e.g.
 * Brazil) — parse the components as a local date instead. */
function parseLocalDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const chartConfig = {
  atendimentos: {
    label: "Atendimentos",
  },
  abertos: {
    label: "Abertos",
    color: "var(--primary)",
  },
  encerrados: {
    label: "Encerrados",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ data }: { data: DashboardChartPoint[] }) {
  const isMobile = useIsMobile()
  const reduced = useReducedMotion()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = data.filter((item) => {
    const date = parseLocalDateOnly(item.date)
    const referenceDate = new Date()
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <motion.div
      variants={fadeIn(reduced, 0.6)}
      initial="hidden"
      animate="show"
    >
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Chamados Abertos x Encerrados</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total dos últimos 3 meses
          </span>
          <span className="@[540px]/card:hidden">Últimos 3 meses</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? "90d")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Últimos 3 meses</ToggleGroupItem>
            <ToggleGroupItem value="30d">Últimos 30 dias</ToggleGroupItem>
            <ToggleGroupItem value="7d">Últimos 7 dias</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setTimeRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Selecione um valor"
            >
              <SelectValue placeholder="Últimos 3 meses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Últimos 3 meses
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Últimos 30 dias
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Últimos 7 dias
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <motion.div
          variants={chartReveal(reduced, 0.75)}
          initial="hidden"
          animate="show"
        >
        <AnimatePresence mode="wait">
          <motion.div
            key={timeRange}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="fillAbertos" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-abertos)"
                      stopOpacity={1.0}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-abertos)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillEncerrados" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-encerrados)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-encerrados)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = parseLocalDateOnly(value)
                    return date.toLocaleDateString("pt-BR", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return parseLocalDateOnly(value).toLocaleDateString("pt-BR", {
                          month: "short",
                          day: "numeric",
                        })
                      }}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="encerrados"
                  type="natural"
                  fill="url(#fillEncerrados)"
                  stroke="var(--color-encerrados)"
                  stackId="a"
                />
                <Area
                  dataKey="abertos"
                  type="natural"
                  fill="url(#fillAbertos)"
                  stroke="var(--color-abertos)"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </motion.div>
        </AnimatePresence>
        </motion.div>
      </CardContent>
    </Card>
    </motion.div>
  )
}
