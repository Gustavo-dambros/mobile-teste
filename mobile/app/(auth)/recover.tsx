import { View, Text, StyleSheet } from "react-native"
import { Link } from "expo-router"

export default function RecoverScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar Conta</Text>
      <Text style={styles.subtitle}>Em breve</Text>
      <Link href="/(auth)/login" style={styles.link}>
        Voltar para o login
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 16, color: "#6b7280", marginTop: 8 },
  link: { color: "#dc2626", marginTop: 24 },
})
