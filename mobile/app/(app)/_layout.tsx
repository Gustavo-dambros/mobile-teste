import { Tabs } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import { Redirect } from "expo-router"
import {
  MessageSquare,
  Headphones,
  LayoutDashboard,
  Columns3,
  PlusCircle,
} from "lucide-react"

export default function AppLayout() {
  const { session, loading } = useAuth()

  if (loading) return null

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#dc2626",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          borderTopColor: "#e5e7eb",
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Atendimentos",
          tabBarIcon: ({ color, size }) => (
            <Headphones size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Criar",
          tabBarIcon: ({ color, size }) => (
            <PlusCircle size={size} color="#dc2626" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="kanban"
        options={{
          title: "Kanban",
          tabBarIcon: ({ color, size }) => (
            <Columns3 size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  )
}
