import { useFonts } from "expo-font"
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StatusBar } from "expo-status-bar"
import "react-native-reanimated"

import { useColorScheme } from "@/components/useColorScheme"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ApiAuthError } from "@unipar/api"

export { ErrorBoundary } from "expo-router"

export const unstable_settings = {
  initialRouteName: "(tabs)",
}

SplashScreen.preventAutoHideAsync()

// Refresh automático + logout/redirect central em 401: capturado via QueryCache.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (failureCount, error) => {
        // 401 já tentou refresh no apiFetch — não retentar a app level.
        if (error instanceof ApiAuthError) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return <RootLayoutNav />
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UnauthorizedGate />
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// ponytail: único lugar que conecta ApiAuthError (vindo do apiFetch/lucide/@unipar/api)
// ao redirect de login do Expo Router. Sem ele, cada hook teria que tratar 401.
function UnauthorizedGate() {
  const { signOut, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const cache = queryClient.getQueryCache()
    return cache.subscribe((event) => {
      const err = event.query.state.error
      if (err instanceof ApiAuthError && session) {
        signOut().finally(() => router.replace("/(auth)/login"))
      }
    })
  }, [signOut, session, router])

  return null
}
