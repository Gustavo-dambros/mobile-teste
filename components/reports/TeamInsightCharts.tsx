"use client"

import { motion, useReducedMotion } from "motion/react"

import { cardsContainer, metricCard } from "@/lib/motion"
import type { CategoryCount } from "@/lib/reports/derive"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryRadarChart } from "@/components/reports/CategoryRadarChart"

const activityColor = "var(--primary)"
const presenceColor = "var(--chart-2)"

export function TeamInsightCharts({
  activityData,
  presenceData,
}: {
  activityData: CategoryCount[]
  presenceData: CategoryCount[]
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      variants={cardsContainer(reduced, 0.1)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2"
    >
      <motion.div variants={metricCard(reduced)}>
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Atividade da Equipe</CardTitle>
            <CardDescription>Situação atual dos colaboradores</CardDescription>
          </CardHeader>
          <CategoryRadarChart data={activityData} color={activityColor} />
        </Card>
      </motion.div>
      <motion.div variants={metricCard(reduced)}>
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Presença da Equipe</CardTitle>
            <CardDescription>Situação atual dos colaboradores</CardDescription>
          </CardHeader>
          <CategoryRadarChart data={presenceData} color={presenceColor} />
        </Card>
      </motion.div>
    </motion.div>
  )
}
