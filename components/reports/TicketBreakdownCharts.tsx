"use client"

import { motion, useReducedMotion } from "motion/react"

import { cardsContainer, metricCard } from "@/lib/motion"
import type { CategoryCount } from "@/lib/reports/derive"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryRadarChart } from "@/components/reports/CategoryRadarChart"

const sectorColor = "var(--primary)"
const priorityColor = "var(--destructive)"
const statusColor = "#22c55e"

export function TicketBreakdownCharts({
  sectorData,
  priorityData,
  statusData,
}: {
  sectorData: CategoryCount[]
  priorityData: CategoryCount[]
  statusData: CategoryCount[]
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      variants={cardsContainer(reduced, 0.05)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3"
    >
      <motion.div variants={metricCard(reduced)}>
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Chamados por Setor</CardTitle>
            <CardDescription>Distribuição entre TI, RH e ADM</CardDescription>
          </CardHeader>
          <CategoryRadarChart data={sectorData} color={sectorColor} />
        </Card>
      </motion.div>
      <motion.div variants={metricCard(reduced)}>
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Chamados por Prioridade</CardTitle>
            <CardDescription>Alta, Média e Baixa</CardDescription>
          </CardHeader>
          <CategoryRadarChart data={priorityData} color={priorityColor} />
        </Card>
      </motion.div>
      <motion.div variants={metricCard(reduced)}>
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Chamados por Status</CardTitle>
            <CardDescription>Aberto, Em andamento e Concluído</CardDescription>
          </CardHeader>
          <CategoryRadarChart data={statusData} color={statusColor} />
        </Card>
      </motion.div>
    </motion.div>
  )
}
