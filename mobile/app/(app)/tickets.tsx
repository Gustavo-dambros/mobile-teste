import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native"
import { useState } from "react"
import { useTicketsQuery } from "@/hooks/tickets"
import type { Ticket } from "@unipar/types"

export default function TicketsScreen() {
  const { data: tickets, isLoading, refetch, isFetching } = useTicketsQuery()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Carregando atendimentos...</Text>
      </View>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Atendimentos</Text>
        <Text style={styles.muted}>Nenhum ticket encontrado.</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      data={tickets}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ padding: 16 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      refreshControl={
        <RefreshControl refreshing={refreshing || isFetching} onRefresh={handleRefresh} />
      }
      renderItem={({ item }) => <TicketCard ticket={item} />}
    />
  )
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const priorityStyles: Record<string, { bg: string; fg: string }> = {
    Alta: { bg: "#fee2e2", fg: "#b91c1c" },
    Média: { bg: "#fef3c7", fg: "#b45309" },
    Baixa: { bg: "#dcfce7", fg: "#15803d" },
  }
  const p = priorityStyles[ticket.priority] ?? priorityStyles.Baixa

  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={styles.ticketNumber}>#{ticket.number}</Text>
        <View style={[styles.badge, { backgroundColor: p.bg }]}>
          <Text style={[styles.badgeText, { color: p.fg }]}>{ticket.priority}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{ticket.title}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>
        {ticket.description}
      </Text>
      <View style={styles.row}>
        <Text style={styles.meta}>{ticket.sector}</Text>
        <Text style={[styles.status, styles.statusOpen]}>{ticket.status}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f9fafb" },
  center: {
    flex: 1,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  muted: { fontSize: 16, color: "#6b7280" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketNumber: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  cardDesc: { fontSize: 14, color: "#4b5563", marginTop: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  meta: { fontSize: 13, color: "#6b7280" },
  status: { fontSize: 13, fontWeight: "500" },
  statusOpen: { color: "#dc2626" },
})
