"use client"

import { motion, useReducedMotion } from "motion/react"

import { cardsContainer, metricCard, hoverLift } from "@/lib/motion"
import type { DashboardMetrics } from "@/lib/dashboard/server"
import { OVERDUE_HOURS } from "@/lib/tickets/status-badge"
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
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react"

const COUNT_UP_START = 0.45
const COUNT_UP_STAGGER = 0.1
const COUNT_UP_DURATION = 0.9

function TrendBadge({ trendPercent }: { trendPercent: number | null }) {
  if (trendPercent === null) {
    return (
      <Badge variant="outline">
        <MinusIcon />
        Sem histórico
      </Badge>
    )
  }
  const isUp = trendPercent >= 0
  return (
    <Badge variant="outline">
      {isUp ? <TrendingUpIcon /> : <TrendingDownIcon />}
      {isUp ? "+" : ""}
      {trendPercent}%
    </Badge>
  )
}

interface CardDef {
  description: string
  value: number
  format: (v: number) => string
  trendPercent: number | null
  footerTitle: string
  footerSubtitle: string
}

export function SectionCards({ metrics }: { metrics: DashboardMetrics }) {
  const reduced = useReducedMotion()
  const cardVariants = metricCard(reduced)
  const hover = reduced ? undefined : hoverLift
  const hoverTransition = { type: "spring" as const, stiffness: 320, damping: 26 }

  const cards: CardDef[] = [
    {
      description: "Chamados em Aberto",
      value: metrics.openInSector.value,
      format: (v) => Math.round(v).toLocaleString("pt-BR"),
      trendPercent: metrics.openInSector.trendPercent,
      footerTitle: "Na fila do setor",
      footerSubtitle: "Aguardando atendimento",
    },
    {
      description: "Chamados em Andamento",
      value: metrics.inProgressMine.value,
      format: (v) => Math.round(v).toLocaleString("pt-BR"),
      trendPercent: metrics.inProgressMine.trendPercent,
      footerTitle: "Sob sua responsabilidade",
      footerSubtitle: "Chamados que você pegou para atender",
    },
    {
      description: "Chamados Concluídos",
      value: metrics.completedThisMonthMine.value,
      format: (v) => Math.round(v).toLocaleString("pt-BR"),
      trendPercent: metrics.completedThisMonthMine.trendPercent,
      footerTitle: "Este mês",
      footerSubtitle: "Chamados que você concluiu este mês",
    },
    {
      description: "Taxa de Conclusão",
      value: metrics.completionRateMine.value,
      format: (v) => `${Math.round(v)}%`,
      trendPercent: metrics.completionRateMine.trendPercent,
      footerTitle: "Chamados seus deste mês",
      footerSubtitle: "% dos que você pegou este mês e já concluiu",
    },
    {
      description: "Chamados Atrasados",
      value: metrics.overdueInSector.value,
      format: (v) => Math.round(v).toLocaleString("pt-BR"),
      trendPercent: metrics.overdueInSector.trendPercent,
      footerTitle: "Na fila do setor",
      footerSubtitle: `Sem primeira resposta há mais de ${OVERDUE_HOURS}h`,
    },
  ]

  return (
    <motion.div
      variants={cardsContainer(reduced)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-5 dark:*:data-[slot=card]:bg-card"
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.description}
          variants={cardVariants}
          whileHover={hover}
          transition={hoverTransition}
          className="group"
        >
          <Card className="@container/card transition-shadow duration-200 group-hover:shadow-md">
            <CardHeader>
              <CardDescription>{card.description}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                <AnimatedNumber
                  value={card.value}
                  delay={reduced ? 0 : COUNT_UP_START + COUNT_UP_STAGGER * index}
                  duration={reduced ? 0 : COUNT_UP_DURATION}
                  format={card.format}
                />
              </CardTitle>
              <CardAction>
                <TrendBadge trendPercent={card.trendPercent} />
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">{card.footerTitle}</div>
              <div className="text-muted-foreground">{card.footerSubtitle}</div>
            </CardFooter>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
