import type { Ticket } from "@/components/tickets/types"
import type { DirectoryMember } from "@/lib/team/directory"
import type { CategoryCount, TicketMetrics } from "@/lib/reports/derive"

export interface ReportExportBundle {
  periodLabel: string
  generatedAt: Date
  metrics: TicketMetrics
  sectorData: CategoryCount[]
  priorityData: CategoryCount[]
  statusData: CategoryCount[]
  activityData: CategoryCount[]
  presenceData: CategoryCount[]
  tickets: Ticket[]
  team: DirectoryMember[]
}

function fileTimestamp(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export async function exportReportPdf(bundle: ReportExportBundle) {
  const { jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const marginX = 14
  let cursorY = 18

  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Relatório de Atendimentos — UNIPAR-CASCAVEL", marginX, cursorY)

  cursorY += 7
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(110)
  doc.text(
    `Período: ${bundle.periodLabel}  •  Gerado em ${bundle.generatedAt.toLocaleString("pt-BR")}`,
    marginX,
    cursorY
  )
  doc.setTextColor(0)

  cursorY += 6

  autoTable(doc, {
    startY: cursorY,
    head: [["Métrica", "Valor"]],
    body: [
      ["Total de chamados", String(bundle.metrics.total)],
      ["Em aberto", String(bundle.metrics.abertos)],
      ["Em andamento", String(bundle.metrics.emAndamento)],
      ["Concluídos", String(bundle.metrics.concluidos)],
      ["Taxa de conclusão", `${bundle.metrics.taxaConclusao}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 30, 30] },
    margin: { left: marginX, right: marginX },
  })

  const distributionTables: Array<{ title: string; rows: CategoryCount[] }> = [
    { title: "Chamados por Setor", rows: bundle.sectorData },
    { title: "Chamados por Prioridade", rows: bundle.priorityData },
    { title: "Chamados por Status", rows: bundle.statusData },
    { title: "Atividade da Equipe", rows: bundle.activityData },
    { title: "Presença da Equipe", rows: bundle.presenceData },
  ]

  for (const table of distributionTables) {
    const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } }
    cursorY = (docWithTable.lastAutoTable?.finalY ?? cursorY) + 8

    if (cursorY > 260) {
      doc.addPage()
      cursorY = 18
    }

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(table.title, marginX, cursorY)
    cursorY += 3

    autoTable(doc, {
      startY: cursorY,
      head: [["Categoria", "Total"]],
      body: table.rows.map((row) => [row.label, String(row.total)]),
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: marginX, right: marginX },
    })
  }

  doc.addPage()
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text("Lista de Chamados", marginX, 18)

  autoTable(doc, {
    startY: 24,
    head: [["Número", "Título", "Setor", "Prioridade", "Status", "Criado em"]],
    body: bundle.tickets.map((t) => [
      t.number,
      t.title,
      t.sector,
      t.priority,
      t.status,
      formatDateTime(t.createdAt),
    ]),
    theme: "grid",
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: { 1: { cellWidth: 60 } },
    margin: { left: marginX, right: marginX },
  })

  doc.save(`relatorio-atendimentos-${fileTimestamp(bundle.generatedAt)}.pdf`)
}

export async function exportReportXlsx(bundle: ReportExportBundle) {
  const XLSX = await import("xlsx")

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Relatório de Atendimentos — UNIPAR-CASCAVEL"],
    [`Período: ${bundle.periodLabel}`],
    [`Gerado em: ${bundle.generatedAt.toLocaleString("pt-BR")}`],
    [],
    ["Métrica", "Valor"],
    ["Total de chamados", bundle.metrics.total],
    ["Em aberto", bundle.metrics.abertos],
    ["Em andamento", bundle.metrics.emAndamento],
    ["Concluídos", bundle.metrics.concluidos],
    ["Taxa de conclusão (%)", bundle.metrics.taxaConclusao],
    [],
    ["Chamados por Setor"],
    ...bundle.sectorData.map((d) => [d.label, d.total]),
    [],
    ["Chamados por Prioridade"],
    ...bundle.priorityData.map((d) => [d.label, d.total]),
    [],
    ["Chamados por Status"],
    ...bundle.statusData.map((d) => [d.label, d.total]),
    [],
    ["Atividade da Equipe"],
    ...bundle.activityData.map((d) => [d.label, d.total]),
    [],
    ["Presença da Equipe"],
    ...bundle.presenceData.map((d) => [d.label, d.total]),
  ])
  summarySheet["!cols"] = [{ wch: 32 }, { wch: 16 }]

  const ticketsSheet = XLSX.utils.json_to_sheet(
    bundle.tickets.map((t) => ({
      Número: t.number,
      Título: t.title,
      Setor: t.sector,
      Prioridade: t.priority,
      Status: t.status,
      Solicitante: t.requesterName,
      Responsável: t.assignee || "Não atribuído",
      "Criado em": formatDateTime(t.createdAt),
      "Atualizado em": formatDateTime(t.updatedAt),
    }))
  )
  ticketsSheet["!cols"] = [
    { wch: 10 },
    { wch: 40 },
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo")
  XLSX.utils.book_append_sheet(workbook, ticketsSheet, "Chamados")

  // Bundled only for admins/sector leaders (see ReportsPage.tsx) — an empty
  // array means the caller wasn't allowed to see it, so the sheet is simply
  // omitted rather than exported blank.
  if (bundle.team.length > 0) {
    const teamSheet = XLSX.utils.json_to_sheet(
      bundle.team.map((m) => ({
        Nome: m.name,
        "E-mail": m.email,
        Telefone: m.phone,
        Setor: m.sector,
        Status: m.role,
        Presença: m.presence,
        Atividade: m.activity,
      }))
    )
    teamSheet["!cols"] = [
      { wch: 24 },
      { wch: 28 },
      { wch: 16 },
      { wch: 24 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(workbook, teamSheet, "Equipe")
  }

  XLSX.writeFile(workbook, `relatorio-atendimentos-${fileTimestamp(bundle.generatedAt)}.xlsx`)
}
