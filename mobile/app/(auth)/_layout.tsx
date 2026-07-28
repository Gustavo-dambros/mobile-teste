import { Stack } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import { Redirect } from "expo-router"

export default function AuthLayout() {
  const { session, loading } = useAuth()

  if (loading) return null

  if (session) {
    return <Redirect href="/(app)" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="recover" />
      <Stack.Screen name="access-request" />
    </Stack>
  )
}
