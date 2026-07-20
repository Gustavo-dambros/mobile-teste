"use client"

import { motion, useReducedMotion } from "motion/react"
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { cardsContainer, metricCard, hoverLift } from "@/lib/motion"
import type { TicketMetrics } from "@/lib/reports/derive"
import { percentDelta } from "@/lib/reports/derive"
import { AnimatedNumber } from "@/components/animated-number"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const COUNT_UP_START = 0.15
const COUNT_UP_STAGGER = 0.08
const COUNT_UP_DURATION = 0.8

function TrendBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null
  if (delta === 0) {
    return (
      <Badge variant="outline">
        <MinusIcon />
        0%
      </Badge>
    )
  }
  const isUp = delta > 0
  return (
    <Badge variant="outline">
      {isUp ? <TrendingUpIcon /> : <TrendingDownIcon />}
      {isUp ? "+" : ""}
      {delta}%
    </Badge>
  )
}

function MetricCard({
  description,
  value,
  format,
  delay,
  delta,
  footerTitle,
  footerSubtitle,
  cardVariants,
  hover,
  hoverTransition,
  reduced,
}: {
  description: string
  value: number
  format: (v: number) => string
  delay: number
  delta: number | null
  footerTitle: string
  footerSubtitle: string
  cardVariants: ReturnType<typeof metricCard>
  hover: typeof hoverLift | undefined
  hoverTransition: { type: "spring"; stiffness: number; damping: number }
  reduced: boolean | null
}) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={hover}
      transition={hoverTransition}
      className="group"
    >
      <Card className="@container/card transition-shadow duration-200 group-hover:shadow-md">
        <CardHeader>
          <CardDescription>{description}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <AnimatedNumber
              value={value}
              delay={reduced ? 0 : delay}
              duration={reduced ? 0 : COUNT_UP_DURATION}
              format={format}
            />
          </CardTitle>
          <CardAction>
            <TrendBadge delta={delta} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">{footerTitle}</div>
          <div className="text-muted-foreground">{footerSubtitle}</div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export function ReportMetricCards({
  metrics,
  previousMetrics,
}: {
  metrics: TicketMetrics
  previousMetrics: TicketMetrics
}) {
  const reduced = useReducedMotion()
  const cardVariants = metricCard(reduced)
  const hover = reduced ? undefined : hoverLift
  const hoverTransition = { type: "spring" as const, stiffness: 320, damping: 26 }

  const totalDelta = percentDelta(metrics.total, previousMetrics.total)
  const abertosDelta = percentDelta(metrics.abertos, previousMetrics.abertos)
  const emAndamentoDelta = percentDelta(metrics.emAndamento, previousMetrics.emAndamento)
  const concluidosDelta = percentDelta(metrics.concluidos, previousMetrics.concluidos)
  const taxaDelta = percentDelta(metrics.taxaConclusao, previousMetrics.taxaConclusao)

  const periodLabel = "no período selecionado"
  const comparisonLabel = "Comparado ao período anterior"

  return (
    <motion.div
      variants={cardsContainer(reduced)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-5 dark:*:data-[slot=card]:bg-card"
    >
      <MetricCard
        description="Total de Chamados"
        value={metrics.total}
        format={(v) => Math.round(v).toLocaleString("pt-BR")}
        delay={COUNT_UP_START}
        delta={totalDelta}
        footerTitle={`Registrados ${periodLabel}`}
        footerSubtitle={comparisonLabel}
        cardVariants={cardVariants}
        hover={hover}
        hoverTransition={hoverTransition}
        reduced={reduced}
      />
      <MetricCard
        description="Em Aberto"
        value={metrics.abertos}
        format={(v) => Math.round(v).toLocaleString("pt-BR")}
        delay={COUNT_UP_START + COUNT_UP_STAGGER}
        delta={abertosDelta}
        footerTitle="Aguardando atendimento"
        footerSubtitle={comparisonLabel}
        cardVariants={cardVariants}
        hover={hover}
        hoverTransition={hoverTransition}
        reduced={reduced}
      />
      <MetricCard
        description="Em Andamento"
        value={metrics.emAndamento}
        format={(v) => Math.round(v).toLocaleString("pt-BR")}
        delay={COUNT_UP_START + COUNT_UP_STAGGER * 2}
        delta={emAndamentoDelta}
        footerTitle="Sendo atendidos agora"
        footerSubtitle={comparisonLabel}
        cardVariants={cardVariants}
        hover={hover}
        hoverTransition={hoverTransition}
        reduced={reduced}
      />
      <MetricCard
        description="Concluídos"
        value={metrics.concluidos}
        format={(v) => Math.round(v).toLocaleString("pt-BR")}
        delay={COUNT_UP_START + COUNT_UP_STAGGER * 3}
        delta={concluidosDelta}
        footerTitle={`Encerrados ${periodLabel}`}
        footerSubtitle={comparisonLabel}
        cardVariants={cardVariants}
        hover={hover}
        hoverTransition={hoverTransition}
        reduced={reduced}
      />
      <MetricCard
        description="Taxa de Conclusão"
        value={metrics.taxaConclusao}
        format={(v) => `${Math.round(v)}%`}
        delay={COUNT_UP_START + COUNT_UP_STAGGER * 4}
        delta={taxaDelta}
        footerTitle="Chamados concluídos vs. total"
        footerSubtitle={comparisonLabel}
        cardVariants={cardVariants}
        hover={hover}
        hoverTransition={hoverTransition}
        reduced={reduced}
      />
    </motion.div>
  )
}
