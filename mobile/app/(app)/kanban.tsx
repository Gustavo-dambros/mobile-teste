import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from "react-native"
import { useState } from "react"
import {
  useBoardsQuery,
  useColumnsQuery,
  useCardsQuery,
  useCompleteCardMutation,
} from "@/hooks/kanban"
import type { KanbanCard, KanbanColumn } from "@unipar/types"

export default function KanbanScreen() {
  const { data: boards, isLoading: boardsLoading } = useBoardsQuery()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)

  const boardId = selectedBoardId ?? boards?.[0]?.id
  const { data: columns, isLoading: colsLoading } = useColumnsQuery(boardId ?? undefined)
  const { data: cards, isFetching, refetch } = useCardsQuery(boardId ?? undefined)
  const [refreshing, setRefreshing] = useState(false)

  const completeMutation = useCompleteCardMutation()

  async function handleRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (boardsLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Carregando quadros...</Text>
      </View>
    )
  }

  if (!boards || boards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Kanban</Text>
        <Text style={styles.muted}>Nenhum quadro encontrado.</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      data={columns ?? []}
      keyExtractor={(c) => c.id}
      horizontal
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={refreshing || isFetching || colsLoading} onRefresh={handleRefresh} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Kanban</Text>
          <View style={styles.boardTabs}>
            {boards.slice(0, 4).map((b) => (
              <Pressable
                key={b.id}
                onPress={() => setSelectedBoardId(b.id)}
                style={[styles.boardTab, b.id === boardId && styles.boardTabActive]}
              >
                <Text style={[styles.boardTabText, b.id === boardId && styles.boardTabTextActive]}>
                  {b.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
      renderItem={({ item: column }) => (
        <KanbanColumnView
          column={column}
          cards={cards?.filter((c) => c.columnId === column.id) ?? []}
          onComplete={(cardId) =>
            completeMutation.mutate({ id: cardId, boardId: boardId! })
          }
        />
      )}
    />
  )
}

function KanbanColumnView({
  column,
  cards,
  onComplete,
}: {
  column: KanbanColumn
  cards: KanbanCard[]
  onComplete: (cardId: string) => void
}) {
  return (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        <View style={[styles.columnDot, { backgroundColor: column.color ?? "#9ca3af" }]} />
        <Text style={styles.columnTitle}>{column.title}</Text>
        <Text style={styles.columnCount}>{cards.length}</Text>
      </View>
      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Pressable
              onPress={() => onComplete(item.id)}
              style={({ pressed }) => [styles.completeBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.completeBtnText}>Concluir</Text>
            </Pressable>
          </View>
        )}
      />
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
  header: { marginBottom: 12, gap: 8 },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  muted: { fontSize: 16, color: "#6b7280" },
  boardTabs: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  boardTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  boardTabActive: { backgroundColor: "#dc2626" },
  boardTabText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  boardTabTextActive: { color: "#ffffff" },
  column: { width: 280, backgroundColor: "#ffffff", borderRadius: 12, padding: 12, gap: 10 },
  columnHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  columnDot: { width: 8, height: 8, borderRadius: 4 },
  columnTitle: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  columnCount: { fontSize: 12, fontWeight: "500", color: "#9ca3af" },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    gap: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  cardDesc: { fontSize: 12, color: "#6b7280" },
  completeBtn: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#dcfce7",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  completeBtnText: { fontSize: 12, fontWeight: "500", color: "#15803d" },
})
