import { View, Text, StyleSheet } from "react-native"

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat Interno</Text>
      <Text style={styles.subtitle}>Em breve</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 16, color: "#6b7280", marginTop: 8 },
})
