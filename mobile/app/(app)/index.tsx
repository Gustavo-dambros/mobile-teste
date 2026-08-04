import { View, Text, ScrollView, StyleSheet } from "react-native"
import { useAuth } from "@/contexts/AuthContext"

export default function DashboardScreen() {
  const { user } = useAuth()

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Olá, {user?.user_metadata?.name?.split(" ")[0] ?? "Usuário"}
        </Text>
        <Text style={styles.subtitle}>Painel de Controle</Text>
      </View>

      <View style={styles.cards}>
        <View style={[styles.card, { backgroundColor: "#dbeafe" }]}>
          <Text style={styles.cardTitle}>Atendimentos</Text>
          <Text style={styles.cardValue}>--</Text>
        </View>
        <View style={[styles.card, { backgroundColor: "#dcfce7" }]}>
          <Text style={styles.cardTitle}>Em andamento</Text>
          <Text style={styles.cardValue}>--</Text>
        </View>
        <View style={[styles.card, { backgroundColor: "#fef3c7" }]}>
          <Text style={styles.cardTitle}>Kanban</Text>
          <Text style={styles.cardValue}>--</Text>
        </View>
        <View style={[styles.card, { backgroundColor: "#f3e8ff" }]}>
          <Text style={styles.cardTitle}>Chat</Text>
          <Text style={styles.cardValue}>--</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 20, paddingTop: 60 },
  greeting: { fontSize: 28, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 16, color: "#6b7280", marginTop: 4 },
  cards: { padding: 20, gap: 12 },
  card: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  cardTitle: { fontSize: 14, color: "#374151", fontWeight: "500" },
  cardValue: { fontSize: 32, fontWeight: "bold", color: "#111827", marginTop: 8 },
})
